import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
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
    const method = options.method || 'GET';
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Handle GET requests (Offline First / Cache Fallback)
    if (method === 'GET') {
      try {
        if (!navigator.onLine) {
          throw new Error('Offline');
        }

        const res = await fetch(url, { ...options, headers });
        
        if (!res.ok) {
          if (res.status === 401) {
            logout();
            throw new Error('Sesión expirada');
          }
          throw new Error(`Error ${res.status}`);
        }

        const data = await res.json();

        // Update local cache based on URL
        if (url.includes('/api/products')) await db.products.bulkPut(data);
        if (url.includes('/api/customers')) await db.customers.bulkPut(data);
        if (url.includes('/api/sales')) await db.sales.bulkPut(data);
        if (url.includes('/api/purchases')) await db.purchases.bulkPut(data);
        if (url.includes('/api/inventory/movements')) await db.inventoryMovements.bulkPut(data);
        if (url.includes('/api/settings')) {
          // Settings are usually an array or object, handle accordingly
          if (Array.isArray(data)) {
            await db.settings.bulkPut(data);
          } else if (typeof data === 'object') {
            const settingsArray = Object.entries(data).map(([key, value]) => ({ key, value }));
            await db.settings.bulkPut(settingsArray);
          }
        }

        return data;
      } catch (err) {
        console.warn('Network fetch failed, trying local DB:', err);
        
        // Fallback to local DB
        if (url.includes('/api/products')) return await db.products.toArray();
        if (url.includes('/api/customers')) return await db.customers.toArray();
        if (url.includes('/api/sales')) return await db.sales.orderBy('created_at').reverse().toArray();
        if (url.includes('/api/purchases')) return await db.purchases.orderBy('created_at').reverse().toArray();
        if (url.includes('/api/inventory/movements')) return await db.inventoryMovements.orderBy('created_at').reverse().toArray();
        if (url.includes('/api/settings')) {
          const settings = await db.settings.toArray();
          return settings.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        }
        
        throw new Error('No se pudo conectar al servidor y no hay datos locales.');
      }
    }

    // Handle POST/PUT/DELETE requests
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }

      const res = await fetch(url, { ...options, headers });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          throw new Error('Sesión expirada');
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      return res.json();
    } catch (err: any) {
      if (err.message === 'Offline' || err.name === 'TypeError' || err.message.includes('Failed to fetch')) {
        console.log('Network error or Offline: Queuing request:', url);
        await db.syncQueue.add({
          endpoint: url,
          method,
          body: options.body ? JSON.parse(options.body as string) : null,
          timestamp: Date.now()
        });

        return { 
          success: true, 
          offline: true, 
          message: 'Guardado localmente por falta de conexión. Se sincronizará automáticamente.' 
        };
      }
      
      throw err;
    }
  };

  return { apiFetch, isOnline };
}
