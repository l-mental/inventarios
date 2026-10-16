import { useAuth } from '../context/AuthContext';
import { handleLocalApiRequest, isStaticHostEnvironment } from '../lib/localApi';
import { useState, useEffect } from 'react';

export function useApi() {
  const { token, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // If on Vercel/static host, offline, or using a local token, route directly to localApi
    if (
      isStaticHostEnvironment() ||
      !navigator.onLine ||
      (token && token.startsWith('local-jwt-'))
    ) {
      return await handleLocalApiRequest(url, options);
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const contentType = res.headers.get('content-type') || '';

      // If Vercel or static hosting returns 404, 405, 5xx, or non-JSON, fallback to localApi
      if (
        res.status === 404 ||
        res.status === 405 ||
        res.status >= 500 ||
        !contentType.includes('application/json')
      ) {
        return await handleLocalApiRequest(url, options);
      }

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          throw new Error('Sesión expirada');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      if (err.message === 'Sesión expirada') {
        throw err;
      }
      // Fallback to local engine if network/404/parse error occurs
      if (
        err instanceof SyntaxError ||
        err.name === 'TypeError' ||
        (err.message && (
          err.message.includes('404') ||
          err.message.includes('Unexpected token') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('not valid JSON')
        ))
      ) {
        return await handleLocalApiRequest(url, options);
      }
      throw err;
    }
  };

  return { apiFetch, isOnline };
}
