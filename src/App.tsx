import { useState, useEffect } from 'react';
import { getLocalTransactions, deleteLocalTransaction, type LocalTransaction } from './db';
import { forceSync, registerSyncListener } from './utils/syncManager';
import { Dashboard } from './components/Dashboard';
import { VoiceInput } from './components/VoiceInput';
import { ReceiptScanner } from './components/ReceiptScanner';
import { TransactionForm } from './components/TransactionForm';
import {
  LayoutDashboard,
  Mic,
  Camera,
  PlusCircle,
  TrendingUp,
  X
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'voice' | 'receipt' | 'add'>('dashboard');
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Sync status
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'success' | 'error' | 'idle'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  
  // Prepopulated state for voice/receipt actions
  const [prepopulatedValues, setPrepopulatedValues] = useState<any>(undefined);

  // Load transactions from Dexie DB
  const loadTransactions = async () => {
    const data = await getLocalTransactions();
    setTransactions(data);
  };

  useEffect(() => {
    // 1. Initial database load
    loadTransactions();

    // 2. Network listener
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Register background sync listener
    const unsubscribe = registerSyncListener((status, msg) => {
      setSyncStatus(status);
      if (msg) {
        setSyncMessage(msg);
        
        // Hide success/error sync messages after 5 seconds
        if (status === 'success' || status === 'error') {
          const timer = setTimeout(() => {
            setSyncMessage('');
          }, 5000);
          return () => clearTimeout(timer);
        }
      }
      // Reload from local IndexedDB on status changes
      loadTransactions();
    });

    // 4. Force initial sync attempt if online
    if (navigator.onLine) {
      forceSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await deleteLocalTransaction(id);
      await loadTransactions();
      // Attempt to sync deletion to TiDB server
      if (isOnline) {
        forceSync();
      }
    }
  };

  const handleParsedResult = (parsed: any) => {
    setPrepopulatedValues(parsed);
    setActiveTab('add'); // Switch to confirmation form
  };

  const handleSaveSuccess = () => {
    setPrepopulatedValues(undefined);
    loadTransactions();
    setActiveTab('dashboard'); // Redirect to dashboard
  };

  return (
    <div className="app-container">
      {/* SVG Gradients definitions for styling Lucide icons */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(250, 89%, 65%)" />
            <stop offset="100%" stopColor="hsl(290, 85%, 60%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <header className="app-header">
        <div className="app-title-group">
          <TrendingUp size={24} style={{ stroke: 'url(#primary-grad)' }} />
          <h1 className="app-logo">MamaLedger</h1>
        </div>
        
        <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main">
        {/* Sync notification Banner */}
        {syncMessage && (
          <div className={`notification-banner ${syncStatus === 'error' ? 'error' : 'success'}`}>
            <span>{syncStatus === 'syncing' ? 'Syncing with TiDB...' : syncMessage}</span>
            <X size={16} onClick={() => setSyncMessage('')} style={{ cursor: 'pointer' }} />
          </div>
        )}

        {/* Tab routing */}
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            onDeleteTransaction={handleDelete}
            onNavigateToAdd={() => {
              setPrepopulatedValues(undefined);
              setActiveTab('add');
            }}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceInput onParsed={handleParsedResult} />
        )}

        {activeTab === 'receipt' && (
          <ReceiptScanner onParsed={handleParsedResult} />
        )}

        {activeTab === 'add' && (
          <TransactionForm
            initialValues={prepopulatedValues}
            onSaveSuccess={handleSaveSuccess}
            onCancel={() => {
              setPrepopulatedValues(undefined);
              setActiveTab('dashboard');
            }}
          />
        )}
      </main>

      {/* Navigation bar */}
      <nav className="app-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <Mic size={20} />
          <span>Voice Log</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'receipt' ? 'active' : ''}`}
          onClick={() => setActiveTab('receipt')}
        >
          <Camera size={20} />
          <span>Scan Paper</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'add' && !prepopulatedValues ? 'active' : ''}`}
          onClick={() => {
            setPrepopulatedValues(undefined);
            setActiveTab('add');
          }}
        >
          <PlusCircle size={20} />
          <span>Add Manual</span>
        </button>
      </nav>
    </div>
  );
}
