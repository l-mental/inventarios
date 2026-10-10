import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { useApi } from '../hooks/useApi';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function SyncManager() {
  const { apiFetch, isOnline } = useApi();
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await db.syncQueue.count();
      setQueueCount(count);
    };
    updateCount();
    
    // Check count every 5 seconds
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && queueCount > 0 && !isSyncing) {
      syncData();
    }
  }, [isOnline, queueCount, isSyncing]);

  const syncData = async () => {
    setIsSyncing(true);
    try {
      const queue = await db.syncQueue.orderBy('timestamp').toArray();
      
      for (const item of queue) {
        try {
          await apiFetch(item.endpoint, {
            method: item.method,
            body: item.body ? JSON.stringify(item.body) : undefined
          });
          // If successful, remove from queue
          await db.syncQueue.delete(item.id!);
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          // If it's a validation error (400), we might want to remove it anyway
          // or keep it to retry. For now, we stop sync to avoid loop on same error
          break;
        }
      }
      
      const newCount = await db.syncQueue.count();
      setQueueCount(newCount);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-pulse">
        <WifiOff className="w-4 h-4" />
        <span className="text-xs font-bold">Modo Offline</span>
      </div>
    );
  }

  if (queueCount > 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        <span className="text-xs font-bold">
          {isSyncing ? 'Sincronizando...' : `${queueCount} pendientes`}
        </span>
      </div>
    );
  }

  return null;
}
