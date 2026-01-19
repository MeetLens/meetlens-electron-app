import { TRANSCRIPTION_WS_URL } from '../config';

export interface ConnectionCallbacks {
  onMessage: (event: MessageEvent) => void;
  onError: (event: Event) => void;
  onClose: (event: CloseEvent) => void;
  onOpen: (event: Event) => void;
}

export interface ConnectionSession {
  sessionId: string;
  callbacks: ConnectionCallbacks;
}

export class WebSocketConnectionManager {
  private static instance: WebSocketConnectionManager;
  private connections: Map<string, WebSocket> = new Map();
  private sessionMap: Map<string, ConnectionSession> = new Map();
  private availableConnections: Set<string> = new Set();
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxConnections: number = 3; // Maximum number of simultaneous connections
  private connectionIdleTimeout: number = 30000; // 30 seconds idle timeout
  private reconnectionAttempts: Map<string, number> = new Map();
  private maxReconnectionAttempts: number = 3;

  private constructor() {}

  public static getInstance(): WebSocketConnectionManager {
    if (!WebSocketConnectionManager.instance) {
      WebSocketConnectionManager.instance = new WebSocketConnectionManager();
    }
    return WebSocketConnectionManager.instance;
  }

  /**
   * Acquire a WebSocket connection for a session
   * Either reuses an available connection or creates a new one
   */
  public async acquireConnection(
    sessionId: string,
    callbacks: ConnectionCallbacks,
    wsUrl: string = TRANSCRIPTION_WS_URL
  ): Promise<WebSocket> {
    console.log(`[WebSocketManager] Acquiring connection for session ${sessionId}`);

    // Check if we already have a connection for this session
    if (this.connections.has(sessionId)) {
      const existingConnection = this.connections.get(sessionId)!;
      if (existingConnection.readyState === WebSocket.OPEN) {
        console.log(`[WebSocketManager] Reusing existing connection for session ${sessionId}`);
        this.updateSessionCallbacks(sessionId, callbacks);
        return existingConnection;
      } else {
        // Clean up stale connection
        this.releaseConnection(sessionId);
      }
    }

    // Try to get an available warm connection
    const warmConnectionId = this.getAvailableConnection();
    if (warmConnectionId) {
      console.log(`[WebSocketManager] Reusing warm connection ${warmConnectionId} for session ${sessionId}`);
      const connection = this.connections.get(warmConnectionId)!;
      this.availableConnections.delete(warmConnectionId);

      // Update session mapping
      this.connections.set(sessionId, connection);
      this.sessionMap.set(sessionId, { sessionId, callbacks });
      this.connections.delete(warmConnectionId);
      this.sessionMap.delete(warmConnectionId);

      // Clear any idle timeout
      const timeout = this.connectionTimeouts.get(warmConnectionId);
      if (timeout) {
        clearTimeout(timeout);
        this.connectionTimeouts.delete(warmConnectionId);
      }

      this.updateConnectionHandlers(connection, sessionId, callbacks);
      return connection;
    }

    // Check if we can create a new connection
    if (this.connections.size >= this.maxConnections) {
      throw new Error(`Maximum connection limit (${this.maxConnections}) reached`);
    }

    // Create new connection
    console.log(`[WebSocketManager] Creating new connection for session ${sessionId}`);
    return this.createNewConnection(sessionId, callbacks, wsUrl);
  }

  /**
   * Release a connection back to the pool for potential reuse
   */
  public releaseConnection(sessionId: string, keepWarm: boolean = true): void {
    console.log(`[WebSocketManager] Releasing connection for session ${sessionId}, keepWarm: ${keepWarm}`);

    const connection = this.connections.get(sessionId);
    if (!connection) {
      console.warn(`[WebSocketManager] No connection found for session ${sessionId}`);
      return;
    }

    // Remove session-specific handlers
    this.removeConnectionHandlers(connection);

    if (keepWarm && connection.readyState === WebSocket.OPEN) {
      // Keep connection warm for reuse
      console.log(`[WebSocketManager] Keeping connection warm for session ${sessionId}`);
      this.availableConnections.add(sessionId);

      // Set idle timeout
      const timeout = setTimeout(() => {
        console.log(`[WebSocketManager] Idle timeout reached for warm connection ${sessionId}`);
        this.forceCloseConnection(sessionId);
      }, this.connectionIdleTimeout);

      this.connectionTimeouts.set(sessionId, timeout);
    } else {
      // Close connection immediately
      this.forceCloseConnection(sessionId);
    }

    // Clean up session mapping
    this.sessionMap.delete(sessionId);
  }

  /**
   * Force close a connection and clean up all resources
   */
  private forceCloseConnection(connectionId: string): void {
    console.log(`[WebSocketManager] Force closing connection ${connectionId}`);

    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.close();
      } catch (error) {
        console.warn(`[WebSocketManager] Error closing connection ${connectionId}:`, error);
      }
    }

    this.connections.delete(connectionId);
    this.availableConnections.delete(connectionId);
    this.sessionMap.delete(connectionId);

    const timeout = this.connectionTimeouts.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(connectionId);
    }

    this.reconnectionAttempts.delete(connectionId);
  }

  /**
   * Get the number of active connections
   */
  public getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get the number of available warm connections
   */
  public getAvailableConnectionCount(): number {
    return this.availableConnections.size;
  }

  /**
   * Clean up all connections (for application shutdown)
   */
  public cleanup(): void {
    console.log('[WebSocketManager] Cleaning up all connections');

    // Clear all timeouts
    for (const timeout of this.connectionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.connectionTimeouts.clear();

    // Close all connections
    for (const connection of this.connections.values()) {
      try {
        connection.close();
      } catch (error) {
        console.warn('[WebSocketManager] Error closing connection during cleanup:', error);
      }
    }

    // Clear all state
    this.connections.clear();
    this.sessionMap.clear();
    this.availableConnections.clear();
    this.reconnectionAttempts.clear();
  }

  /**
   * Create a new WebSocket connection
   */
  private async createNewConnection(
    sessionId: string,
    callbacks: ConnectionCallbacks,
    wsUrl: string
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        const connection = new WebSocket(wsUrl);
        // Track connection creation time for uptime monitoring
        (connection as any)._connectionStartTime = Date.now();

        this.connections.set(sessionId, connection);
        this.sessionMap.set(sessionId, { sessionId, callbacks });

        // Set up event handlers
        this.updateConnectionHandlers(connection, sessionId, callbacks);

        connection.onopen = (event) => {
          console.log(`[WebSocketManager] Connection opened for session ${sessionId}`);
          this.reconnectionAttempts.delete(sessionId);
          callbacks.onOpen(event);
          resolve(connection);
        };

        connection.onerror = (event) => {
          console.error(`[WebSocketManager] Connection error for session ${sessionId}`);
          callbacks.onError(event);
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        console.error(`[WebSocketManager] Failed to create connection for session ${sessionId}:`, error);
        this.connections.delete(sessionId);
        this.sessionMap.delete(sessionId);
        reject(error);
      }
    });
  }

  /**
   * Update connection event handlers for a session
   */
  private updateConnectionHandlers(
    connection: WebSocket,
    sessionId: string,
    callbacks: ConnectionCallbacks
  ): void {
    connection.onmessage = callbacks.onMessage;
    connection.onerror = (event) => {
      console.error(`[WebSocketManager] Connection error for session ${sessionId}`);
      this.handleConnectionError(sessionId, event, callbacks);
    };
    connection.onclose = (event) => {
      console.log(`[WebSocketManager] Connection closed for session ${sessionId}`);
      this.handleConnectionClose(sessionId, event, callbacks);
    };
  }

  /**
   * Handle connection errors with retry logic
   */
  private handleConnectionError(
    sessionId: string,
    event: Event,
    callbacks: ConnectionCallbacks
  ): void {
    const attempts = this.reconnectionAttempts.get(sessionId) || 0;

    if (attempts < this.maxReconnectionAttempts) {
      console.log(`[WebSocketManager] Attempting reconnection for session ${sessionId} (attempt ${attempts + 1}/${this.maxReconnectionAttempts})`);
      this.reconnectionAttempts.set(sessionId, attempts + 1);

      // Attempt reconnection after a delay
      setTimeout(() => {
        this.attemptReconnection(sessionId, callbacks);
      }, Math.min(1000 * Math.pow(2, attempts), 10000)); // Exponential backoff, max 10s
    } else {
      console.error(`[WebSocketManager] Max reconnection attempts reached for session ${sessionId}`);
      callbacks.onError(event);
      this.forceCloseConnection(sessionId);
    }
  }

  /**
   * Handle connection close events
   */
  private handleConnectionClose(
    sessionId: string,
    event: CloseEvent,
    callbacks: ConnectionCallbacks
  ): void {
    // Only attempt reconnection for unexpected closes (not clean closes)
    if (event.code !== 1000 && event.code !== 1001) {
      const attempts = this.reconnectionAttempts.get(sessionId) || 0;
      if (attempts < this.maxReconnectionAttempts) {
        console.log(`[WebSocketManager] Unexpected close for session ${sessionId}, attempting reconnection`);
        this.reconnectionAttempts.set(sessionId, attempts + 1);

        setTimeout(() => {
          this.attemptReconnection(sessionId, callbacks);
        }, Math.min(1000 * Math.pow(2, attempts), 10000));
      } else {
        callbacks.onClose(event);
        this.forceCloseConnection(sessionId);
      }
    } else {
      callbacks.onClose(event);
    }
  }

  /**
   * Attempt to reconnect a failed connection
   */
  private async attemptReconnection(
    sessionId: string,
    callbacks: ConnectionCallbacks
  ): void {
    try {
      const session = this.sessionMap.get(sessionId);
      if (!session) {
        console.warn(`[WebSocketManager] No session data found for reconnection attempt ${sessionId}`);
        return;
      }

      console.log(`[WebSocketManager] Reconnecting session ${sessionId}`);

      // Remove the old connection
      this.forceCloseConnection(sessionId);

      // Create new connection
      const connection = await this.createNewConnection(sessionId, callbacks, this.getConnectionUrl(sessionId));
      console.log(`[WebSocketManager] Successfully reconnected session ${sessionId}`);

      // Reset reconnection attempts on success
      this.reconnectionAttempts.delete(sessionId);

    } catch (error) {
      console.error(`[WebSocketManager] Reconnection failed for session ${sessionId}:`, error);
      // Error handling will be done by the createNewConnection error handler
    }
  }

  /**
   * Get the WebSocket URL for a session (stored in session data)
   */
  private getConnectionUrl(sessionId: string): string {
    // For now, return default URL since we don't store per-session URLs
    // This could be enhanced to store URL per session if needed
    return TRANSCRIPTION_WS_URL;
  }

  /**
   * Remove connection event handlers
   */
  private removeConnectionHandlers(connection: WebSocket): void {
    connection.onmessage = null;
    connection.onerror = null;
    connection.onclose = null;
    connection.onopen = null;
  }

  /**
   * Update callbacks for an existing session
   */
  private updateSessionCallbacks(sessionId: string, callbacks: ConnectionCallbacks): void {
    const session = this.sessionMap.get(sessionId);
    if (session) {
      session.callbacks = callbacks;
      const connection = this.connections.get(sessionId);
      if (connection) {
        this.updateConnectionHandlers(connection, sessionId, callbacks);
      }
    }
  }

  /**
   * Get an available warm connection ID
   */
  private getAvailableConnection(): string | null {
    const available = Array.from(this.availableConnections);
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Check if a connection is healthy
   */
  public isConnectionHealthy(sessionId: string): boolean {
    const connection = this.connections.get(sessionId);
    return connection ? connection.readyState === WebSocket.OPEN : false;
  }

  /**
   * Get diagnostic information about connections
   */
  public getDiagnostics(): {
    activeConnections: number;
    availableConnections: number;
    maxConnections: number;
    connectionStates: Record<string, string>;
    potentialLeaks: string[];
    uptime: Record<string, number>;
  } {
    const connectionStates: Record<string, string> = {};
    const potentialLeaks: string[] = [];
    const uptime: Record<string, number> = {};
    const now = Date.now();

    for (const [sessionId, connection] of this.connections) {
      let state = 'UNKNOWN';
      switch (connection.readyState) {
        case WebSocket.CONNECTING:
          state = 'CONNECTING';
          break;
        case WebSocket.OPEN:
          state = 'OPEN';
          break;
        case WebSocket.CLOSING:
          state = 'CLOSING';
          break;
        case WebSocket.CLOSED:
          state = 'CLOSED';
          break;
      }
      connectionStates[sessionId] = state;

      // Check for potential leaks (connections open for more than 1 hour)
      // This is a simple heuristic - in a real app you might want more sophisticated leak detection
      const connectionStartTime = (connection as any)._connectionStartTime || now;
      uptime[sessionId] = now - connectionStartTime;

      if (uptime[sessionId] > 60 * 60 * 1000) { // 1 hour
        potentialLeaks.push(sessionId);
      }
    }

    return {
      activeConnections: this.connections.size,
      availableConnections: this.availableConnections.size,
      maxConnections: this.maxConnections,
      connectionStates,
      potentialLeaks,
      uptime,
    };
  }

  /**
   * Monitor connection health and log warnings for potential issues
   */
  public performHealthCheck(): void {
    const diagnostics = this.getDiagnostics();

    if (diagnostics.potentialLeaks.length > 0) {
      console.warn(`[WebSocketManager] Potential connection leaks detected:`, diagnostics.potentialLeaks);
    }

    if (diagnostics.activeConnections > diagnostics.maxConnections * 0.8) {
      console.warn(`[WebSocketManager] High connection usage: ${diagnostics.activeConnections}/${diagnostics.maxConnections}`);
    }

    // Log connection pool status periodically
    console.log(`[WebSocketManager] Health check - Active: ${diagnostics.activeConnections}, Available: ${diagnostics.availableConnections}, Max: ${diagnostics.maxConnections}`);
  }

  /**
   * Force cleanup of leaked connections (use with caution)
   */
  public forceCleanupLeakedConnections(maxAgeMs: number = 60 * 60 * 1000): void {
    const diagnostics = this.getDiagnostics();
    const now = Date.now();

    for (const sessionId of diagnostics.potentialLeaks) {
      const connectionUptime = diagnostics.uptime[sessionId];
      if (connectionUptime > maxAgeMs) {
        console.warn(`[WebSocketManager] Force closing potentially leaked connection: ${sessionId} (uptime: ${Math.round(connectionUptime / 1000 / 60)} minutes)`);
        this.forceCloseConnection(sessionId);
      }
    }
  }
}