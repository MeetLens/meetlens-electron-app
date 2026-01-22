declare module 'path' {
  const path: {
    join: (...paths: string[]) => string;
  };

  export default path;
}

declare module 'vitest' {
  export const describe: any;
  export const it: any;
  export const expect: any;
  export const vi: any;
  export const beforeEach: any;
}

declare module 'better-sqlite3' {
  export namespace Database {
    interface RunResult {
      lastInsertRowid: number;
    }

    interface Statement {
      run: (...params: any[]) => RunResult;
      all: (...params: any[]) => any[];
      get: (...params: any[]) => any;
    }
  }

  export default class Database {
    constructor(path: string);
    exec: (sql: string) => void;
    prepare: (sql: string) => Database.Statement;
    pragma: (sql: string, options?: { simple?: boolean }) => any;
    transaction: <T extends (...params: any[]) => any>(fn: T) => T;
    close: () => void;
  }
}

declare module 'electron' {
  export interface BrowserWindowConstructorOptions {
    [key: string]: any;
  }

  export class BrowserWindow {
    constructor(options?: BrowserWindowConstructorOptions);
    loadURL(url: string): void;
    loadFile(filePath: string): void;
    on(event: string, listener: (...args: any[]) => void): void;
    webContents: { openDevTools: () => void };
    static getAllWindows(): BrowserWindow[];
  }

  export interface IpcMainInvokeEvent {}

  export const app: {
    isPackaged: boolean;
    whenReady: () => Promise<void>;
    on: (event: string, listener: (...args: any[]) => void) => void;
    getPath: (name: string) => string;
    quit: () => void;
  };

  export const ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => void;
  };

  export const desktopCapturer: {
    getSources: (options: any) => Promise<any[]>;
  };

  export const contextBridge: {
    exposeInMainWorld: (key: string, api: any) => void;
  };

  export const ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}

declare const __dirname: string;

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
  platform: string;
};

declare class URLSearchParams {
  constructor(init?: any);
  append(name: string, value: string): void;
  toString(): string;
}

declare function fetch(input: any, init?: any): Promise<any>;
