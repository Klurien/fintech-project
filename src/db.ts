import Dexie, { type Table } from 'dexie';

export interface LocalTransaction {
  id: string; // UUID generated locally
  type: 'income' | 'expense';
  amount: number;
  description: string;
  quantity: string;
  category: string;
  source: 'manual' | 'voice' | 'receipt';
  date: string; // YYYY-MM-DD
  synced: number; // 0 = unsynced (local only), 1 = synced
  created_at: string; // ISO String
}

export class MerchantDatabase extends Dexie {
  transactions!: Table<LocalTransaction>;
  pending_deletions!: Table<{ id: string }>;

  constructor() {
    super('MerchantDatabase');
    this.version(1).stores({
      transactions: 'id, type, amount, category, source, date, synced, created_at',
      pending_deletions: 'id'
    });
  }
}

export const db = new MerchantDatabase();

// Helpers for database operations
export async function getLocalTransactions() {
  return await db.transactions.orderBy('created_at').reverse().toArray();
}

export async function addLocalTransaction(tx: Omit<LocalTransaction, 'synced' | 'created_at' | 'id'> & { id?: string }) {
  const newTx: LocalTransaction = {
    ...tx,
    id: tx.id || crypto.randomUUID(),
    synced: 0,
    created_at: new Date().toISOString()
  };
  await db.transactions.add(newTx);
  return newTx;
}

export async function deleteLocalTransaction(id: string) {
  // Delete locally first
  await db.transactions.delete(id);
  // Queue deletion for sync
  await db.pending_deletions.put({ id });
}

export async function markAsSynced(ids: string[]) {
  await db.transaction('rw', db.transactions, async () => {
    for (const id of ids) {
      await db.transactions.update(id, { synced: 1 });
    }
  });
}

export async function removePendingDeletion(id: string) {
  await db.pending_deletions.delete(id);
}

