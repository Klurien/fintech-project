import { useState, useEffect } from 'react';
import { getLocalTransactions, deleteLocalTransaction, type LocalTransaction, clearLocalTransactions, hasUnsyncedTransactions, db } from './db';
import { forceSync, registerSyncListener } from './utils/syncManager';
import { Dashboard } from './components/Dashboard';
import { VoiceInput } from './components/VoiceInput';
import { ReceiptScanner } from './components/ReceiptScanner';
import { TransactionForm } from './components/TransactionForm';
import { Auth } from './components/Auth';
import {
  LayoutDashboard,
  Mic,
  Camera,
  PlusCircle,
  TrendingUp,
  X,
  LogOut,
  User
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'voice' | 'receipt' | 'add'>('dashboard');
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('userEmail'));
  const [displayName, setDisplayName] = useState<string | null>(localStorage.getItem('userDisplayName'));
  const [photoURL, setPhotoURL] = useState<string | null>(localStorage.getItem('userPhotoURL'));
  
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

  // Pull synced transactions from server on login
  const syncOnLogin = async (authToken: string) => {
    try {
      const response = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const serverTxs = await response.json();
        // Upsert to IndexedDB transactions table
        await db.transaction('rw', db.transactions, async () => {
          for (const tx of serverTxs) {
            await db.transactions.put({
              ...tx,
              synced: 1 // marked as synced
            });
          }
        });
        loadTransactions();
      }
    } catch (err) {
      console.error('Failed to sync transactions on login:', err);
    }
  };

  useEffect(() => {
    if (!token) return;

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
        
        if (status === 'success' || status === 'error') {
          const timer = setTimeout(() => {
            setSyncMessage('');
          }, 5000);
          return () => clearTimeout(timer);
        }
      }
      loadTransactions();
    });

    // 4. Force initial sync attempt if online
    if (navigator.onLine) {
      forceSync();
    }

    // 5. Auth expired listener
    const handleAuthExpired = () => {
      console.warn('Auth token expired. Logging out...');
      logout(true);
    };
    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('auth-expired', handleAuthExpired);
      unsubscribe();
    };
  }, [token]);

  const handleAuthSuccess = async (
    authToken: string,
    email: string,
    type: 'local' | 'google',
    name?: string,
    avatar?: string
  ) => {
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('authType', type);
    if (name) localStorage.setItem('userDisplayName', name);
    if (avatar) localStorage.setItem('userPhotoURL', avatar);

    setToken(authToken);
    setUserEmail(email);
    setDisplayName(name || null);
    setPhotoURL(avatar || null);

    // Pull from database immediately on login
    await syncOnLogin(authToken);
  };

  const logout = async (force: boolean = false) => {
    if (!force) {
      const hasUnsynced = await hasUnsyncedTransactions();
      if (hasUnsynced) {
        const confirmLogout = window.confirm(
          'Warning: You have offline transactions that have not synced to the cloud. Logging out will clear these local unsynced changes. Are you sure you want to log out?'
        );
        if (!confirmLogout) return;
      } else {
        const confirmLogout = window.confirm('Are you sure you want to log out?');
        if (!confirmLogout) return;
      }
    }

    // Clear local cache
    await clearLocalTransactions();

    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authType');
    localStorage.removeItem('userDisplayName');
    localStorage.removeItem('userPhotoURL');

    // Reset state
    setToken(null);
    setUserEmail(null);
    setDisplayName(null);
    setPhotoURL(null);
    setTransactions([]);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await deleteLocalTransaction(id);
      await loadTransactions();
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

  // Render Auth screen if not authenticated
  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-layout">
      {/* SVG Gradients definitions for styling Lucide icons */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(250, 89%, 65%)" />
            <stop offset="100%" stopColor="hsl(290, 85%, 60%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Desktop Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <TrendingUp size={24} style={{ stroke: 'url(#primary-grad)' }} />
          <span>Vendor Assist</span>
        </div>

        <div className="sidebar-user-card glass-panel">
          {photoURL ? (
            <img src={photoURL} alt="Profile" className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">
              <User size={18} />
            </div>
          )}
          <div className="user-info">
            <span className="user-name">{displayName || 'Merchant'}</span>
            <span className="user-email" title={userEmail || ''}>{userEmail}</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`sidebar-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className={`sidebar-menu-item ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <Mic size={18} />
            <span>Voice Log</span>
          </button>

          <button
            className={`sidebar-menu-item ${activeTab === 'receipt' ? 'active' : ''}`}
            onClick={() => setActiveTab('receipt')}
          >
            <Camera size={18} />
            <span>Scan Paper</span>
          </button>

          <button
            className={`sidebar-menu-item ${activeTab === 'add' && !prepopulatedValues ? 'active' : ''}`}
            onClick={() => {
              setPrepopulatedValues(undefined);
              setActiveTab('add');
            }}
          >
            <PlusCircle size={18} />
            <span>Add Manual</span>
          </button>
        </nav>

        <button onClick={() => logout(false)} className="btn btn-secondary sidebar-logout-btn">
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </aside>

      {/* Mobile/Tablet Layout Container */}
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="app-title-group">
            <TrendingUp size={24} style={{ stroke: 'url(#primary-grad)' }} />
            <h1 className="app-logo">Vendor Assist</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Mobile-only logout trigger */}
            <button onClick={() => logout(false)} className="mobile-logout-btn" title="Log Out">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
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

        {/* Mobile bottom navigation bar */}
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
    </div>
  );
}
