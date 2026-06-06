import { db, markAsSynced, removePendingDeletion } from '../db';

type SyncCallback = (status: 'syncing' | 'success' | 'error' | 'idle', details?: string) => void;
const listeners = new Set<SyncCallback>();

let syncStatus: 'syncing' | 'success' | 'error' | 'idle' = 'idle';

export function registerSyncListener(callback: SyncCallback) {
  listeners.add(callback);
  // Send current status immediately
  callback(syncStatus);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners(status: typeof syncStatus, details?: string) {
  syncStatus = status;
  listeners.forEach(cb => cb(status, details));
}

export async function forceSync(): Promise<boolean> {
  if (!navigator.onLine) {
    notifyListeners('idle', 'Offline. Sync will resume when online.');
    return false;
  }

  if (syncStatus === 'syncing') return false;

  notifyListeners('syncing');

  try {
    const token = localStorage.getItem('authToken');

    // 1. Process pending deletions first
    const pendingDeletions = await db.pending_deletions.toArray();
    for (const deletion of pendingDeletions) {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/transactions/${deletion.id}`, {
          method: 'DELETE',
          headers
        });
        
        if (response.status === 401) {
          window.dispatchEvent(new Event('auth-expired'));
          throw new Error('Session expired');
        }

        // If success (200) or already deleted on server (404), remove from pending
        if (response.ok || response.status === 404) {
          await removePendingDeletion(deletion.id);
        }
      } catch (err) {
        console.error(`Failed to sync deletion for ID ${deletion.id}:`, err);
      }
    }

    // 2. Fetch all local unsynced transactions
    const unsyncedTransactions = await db.transactions
      .where('synced')
      .equals(0)
      .toArray();

    if (unsyncedTransactions.length === 0) {
      notifyListeners('success', 'Database fully synchronized.');
      return true;
    }

    // 3. Post unsynced transactions to backend
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/transactions/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(unsyncedTransactions)
    });

    if (response.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.statusText}`);
    }

    const result = await response.json();
    const syncedIds = result.syncedIds || unsyncedTransactions.map(t => t.id);

    // 4. Mark them as synced in IndexedDB
    await markAsSynced(syncedIds);

    notifyListeners('success', `Synced ${syncedIds.length} transaction(s) successfully.`);
    return true;
  } catch (error: any) {
    console.error('Synchronization failed:', error);
    notifyListeners('error', error.message || 'Sync failed.');
    return false;
  }
}

// Set up automatic listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App is online. Triggering synchronization...');
    forceSync();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline.');
    notifyListeners('idle', 'App is offline.');
  });
}
