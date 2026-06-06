import React, { useState, useMemo } from 'react';
import { type LocalTransaction } from '../db';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Mic,
  Camera,
  Edit2,
  Trash2,
  CheckCircle,
  CloudLightning,
  Filter,
  Plus,
  Sparkles,
  Loader,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { getBusinessInsights, type BusinessInsight } from '../utils/gemini';

interface DashboardProps {
  transactions: LocalTransaction[];
  onDeleteTransaction: (id: string) => void;
  onNavigateToAdd: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onDeleteTransaction,
  onNavigateToAdd
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'all'>('7days');
  const [insights, setInsights] = useState<BusinessInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string>('');

  // 1. Calculate Summary Cards metrics
  const { totalIncome, totalExpense, netProfit } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    return {
      totalIncome: income,
      totalExpense: expense,
      netProfit: income - expense
    };
  }, [transactions]);

  const fetchInsights = async () => {
    if (transactions.length === 0) return;
    setInsightsLoading(true);
    setInsightsError('');
    try {
      const result = await getBusinessInsights(
        transactions.map(t => ({
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          date: t.date
        }))
      );
      setInsights(result);
    } catch (err) {
      setInsightsError('Could not load AI insights. Check your connection and try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // 2. Filter transactions based on type and date ranges
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    // Filter by time range
    const now = new Date();
    if (timeRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      result = result.filter(t => new Date(t.date) >= sevenDaysAgo);
    } else if (timeRange === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      result = result.filter(t => new Date(t.date) >= thirtyDaysAgo);
    }

    return result;
  }, [transactions, filterType, timeRange]);

  // 3. Prepare Chart Data (group by date)
  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string; income: number; expense: number; profit: number }> = {};
    
    // Fill in last 7 days with zero values to ensure graph displays chronological days even if empty
    const limit = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 10; // default to 10 if all
    
    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // Format as DD/MM for chart labels
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dailyData[dateStr] = { date: label, income: 0, expense: 0, profit: 0 };
    }

    // Aggregate transactions into dates
    transactions.forEach(t => {
      const dateStr = t.date;
      if (dailyData[dateStr]) {
        if (t.type === 'income') {
          dailyData[dateStr].income += t.amount;
        } else {
          dailyData[dateStr].expense += t.amount;
        }
        dailyData[dateStr].profit = dailyData[dateStr].income - dailyData[dateStr].expense;
      } else if (timeRange === 'all') {
        // If "all" and date is older than 10 days, dynamically add it
        const formattedLabel = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { date: formattedLabel, income: 0, expense: 0, profit: 0 };
        }
        if (t.type === 'income') {
          dailyData[dateStr].income += t.amount;
        } else {
          dailyData[dateStr].expense += t.amount;
        }
        dailyData[dateStr].profit = dailyData[dateStr].income - dailyData[dateStr].expense;
      }
    });

    return Object.values(dailyData);
  }, [transactions, timeRange]);

  // Source icon helper
  const getSourceIcon = (source: 'manual' | 'voice' | 'receipt') => {
    switch (source) {
      case 'voice':
        return <Mic size={14} style={{ opacity: 0.8 }} />;
      case 'receipt':
        return <Camera size={14} style={{ opacity: 0.8 }} />;
      default:
        return <Edit2 size={14} style={{ opacity: 0.8 }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Metrics Summary Section */}
      <div className="metrics-grid">
        <div className="glass-panel net-profit-card">
          <span className="metric-label">Net Profit / Loss</span>
          <span className={`metric-value ${netProfit >= 0 ? 'profit' : 'loss'}`}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{netProfit >= 0 ? 'In profit' : 'Operating in loss'}</span>
          </div>
        </div>

        <div className="glass-panel metric-card income">
          <span className="metric-label">Total Income</span>
          <span className="small-metric-val income">
            {totalIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-panel metric-card expense">
          <span className="metric-label">Total Expenses</span>
          <span className="small-metric-val expense">
            {totalExpense.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={15} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>AI Business Insights</span>
          </div>
          <button
            onClick={fetchInsights}
            disabled={insightsLoading || transactions.length === 0}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.4rem 0.875rem', fontSize: '0.8rem', height: '34px' }}
          >
            {insightsLoading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {insightsLoading ? 'Analysing…' : insights ? 'Refresh' : 'Analyse'}
          </button>
        </div>

        {insightsError && (
          <div className="notification-banner error" style={{ margin: 0 }}>
            <AlertTriangle size={14} />
            <span>{insightsError}</span>
          </div>
        )}

        {!insights && !insightsLoading && !insightsError && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {transactions.length === 0
              ? 'Add some transactions first, then click Analyse for AI insights.'
              : 'Click Analyse to get Gemini AI insights on your business performance.'}
          </p>
        )}

        {insights && !insightsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Trend + Summary */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem', background: 'var(--grey-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                {insights.trend === 'positive'
                  ? <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                  : insights.trend === 'negative'
                  ? <TrendingDown size={18} style={{ color: 'var(--danger)' }} />
                  : <DollarSign size={18} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{insights.summary}</p>
            </div>

            {/* Suggestion */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)' }}>
              <Lightbulb size={15} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', marginBottom: '0.2rem' }}>Suggestion</div>
                <p style={{ fontSize: '0.85rem', color: '#166534', lineHeight: '1.45' }}>{insights.suggestion}</p>
              </div>
            </div>

            {/* Warning */}
            {insights.warning && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
                <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '0.15rem' }} />
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning)', marginBottom: '0.2rem' }}>Warning</div>
                  <p style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: '1.45' }}>{insights.warning}</p>
                </div>
              </div>
            )}

            {/* Top expense category badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span>Top expense category:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', background: 'var(--grey-100)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {insights.topExpenseCategory}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Content Grid */}
      <div className="dashboard-content-grid">
        {/* 2. Visual Financial Health Chart */}
        <div className="glass-panel chart-container">
          <div className="chart-title-bar">
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Daily Cash Flow</h4>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All-Time</option>
            </select>
          </div>

          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 12, 18, 0.9)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.8125rem'
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Transaction Log Section */}
        <div className="tx-list-container">
          <div className="section-header">
            <div className="section-title">
              <Filter size={18} style={{ color: 'var(--primary)' }} />
              <span>Transaction Ledger</span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Filter buttons */}
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
              >
                <option value="all">All Items</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="glass-panel empty-state">
              <DollarSign className="empty-state-icon" />
              <p style={{ fontWeight: 600 }}>No Transactions Found</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Add a transaction by voice, receipt photo, or type it in!
              </p>
              <button
                onClick={onNavigateToAdd}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem', marginTop: '0.5rem', borderRadius: '8px' }}
              >
                <Plus size={16} /> Record Transaction
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {filteredTransactions.map(tx => (
                <div key={tx.id} className={`glass-panel tx-item ${tx.type}`}>
                  <div className="tx-item-left">
                    <div className="tx-icon-wrapper">
                      {getSourceIcon(tx.source)}
                    </div>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <div className="tx-meta">
                        <span className="tx-date">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {tx.quantity && <span className="tx-qty">{tx.quantity}</span>}
                        <span style={{ textTransform: 'capitalize' }}>&bull; {tx.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="tx-item-right">
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(0)} KES
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Sync indicator */}
                      {tx.synced === 1 ? (
                        <span className="sync-status-icon synced" title="Synced to Server">
                          <CheckCircle size={13} />
                        </span>
                      ) : (
                        <span className="sync-status-icon pending" title="Pending Sync (Offline)">
                          <CloudLightning size={13} />
                        </span>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255, 99, 99, 0.45)',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '4px'
                        }}
                        className="delete-tx-btn"
                        title="Delete Transaction"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
