import { useEffect, useState } from 'react';
import { BACKEND_HTTP_BASE_URL } from '../config';

const HEALTH_CHECK_INTERVAL_MS = 30000;
const HEALTH_CHECK_TIMEOUT_MS = 5000;

const checkBackendHealth = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_HTTP_BASE_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setBackendReachable(false);
      return undefined;
    }

    let isMounted = true;

    const runCheck = async () => {
      const result = await checkBackendHealth();
      if (isMounted) {
        setBackendReachable(result);
      }
    };

    setBackendReachable(null);
    runCheck();

    const intervalId = window.setInterval(runCheck, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isOnline]);

  return { isOnline, backendReachable };
};

export default useNetworkStatus;
