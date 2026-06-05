'use client';
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LedgerEntry {
  id: string;
  ts: string;
  debitAccount: string;
  creditAccount: string;
  amount: string;
  currency: string;
  sourceRef: string | null;
  signatureHash: string | null;
}

export default function LedgerFeed() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLedger() {
      try {
        const response = await fetch('/api/ledger');
        if (!response.ok) {
          throw new Error('Failed to fetch ledger entries');
        }
        const data = await response.json();
        if (data.success) {
          setEntries(data.entries);
        } else {
          throw new Error(data.error || 'Unknown error fetching ledger');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchLedger();
    const interval = setInterval(fetchLedger, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-500 p-4 text-center">
        Error loading ledger: {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-gray-500 italic">
        No ledger entries found. Dictate a new entry or submit a receipt.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors duration-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-gray-400 font-mono">
              {new Date(entry.ts).toLocaleString()}
            </span>
            <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              {entry.amount} {entry.currency}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 font-medium">{entry.creditAccount}</span>
              <span className="text-gray-500">→</span>
              <span className="text-blue-400 font-medium">{entry.debitAccount}</span>
            </div>
          </div>
          
          {entry.signatureHash && (
            <div className="mt-2 text-[10px] text-gray-600 font-mono truncate" title={entry.signatureHash}>
              sig: {entry.signatureHash.substring(0, 16)}...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
