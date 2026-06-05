import React, { useState, useEffect } from 'react';
import { addLocalTransaction } from '../db';
import { forceSync } from '../utils/syncManager';
import { Check, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TransactionFormProps {
  initialValues?: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    quantity: string;
    category: string;
    source: 'manual' | 'voice' | 'receipt';
  };
  onSaveSuccess: () => void;
  onCancel?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialValues,
  onSaveSuccess,
  onCancel
}) => {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [category, setCategory] = useState<string>('inventory');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<'manual' | 'voice' | 'receipt'>('manual');
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Sync state when parent passes new initialValues (e.g. from Voice or OCR parser)
  useEffect(() => {
    if (initialValues) {
      setType(initialValues.type);
      setAmount(initialValues.amount > 0 ? initialValues.amount.toString() : '');
      setDescription(initialValues.description);
      setQuantity(initialValues.quantity || '');
      setCategory(initialValues.category || 'inventory');
      setSource(initialValues.source);
    }
  }, [initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description or item name.');
      return;
    }

    setLoading(true);

    try {
      // 1. Save to local IndexedDB first (fully offline operational)
      await addLocalTransaction({
        type,
        amount: parsedAmount,
        description: description.trim(),
        quantity: quantity.trim(),
        category,
        source,
        date
      });

      // 2. Clear inputs
      setAmount('');
      setDescription('');
      setQuantity('');
      setCategory('inventory');
      
      // 3. Proactively attempt background sync to TiDB
      forceSync();

      // 4. Trigger success callback
      onSaveSuccess();
    } catch (err: any) {
      console.error(err);
      setError('Failed to record transaction locally.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.25rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
        {initialValues ? 'Confirm Recorded Transaction' : 'Add New Transaction'}
      </h3>

      {error && (
        <div className="notification-banner error">
          <span>{error}</span>
          <X size={16} onClick={() => setError('')} style={{ cursor: 'pointer' }} />
        </div>
      )}

      {/* Transaction Type Selection */}
      <div className="type-toggle-container">
        <button
          type="button"
          className={`type-toggle-btn income ${type === 'income' ? 'active' : ''}`}
          onClick={() => setType('income')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowUpRight size={16} /> Income (Sale)
          </span>
        </button>
        <button
          type="button"
          className={`type-toggle-btn expense ${type === 'expense' ? 'active' : ''}`}
          onClick={() => setType('expense')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowDownRight size={16} /> Expense (Cost)
          </span>
        </button>
      </div>

      {/* Description / Item Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="description">Item / Transaction Description</label>
        <input
          id="description"
          type="text"
          className="form-control"
          placeholder="e.g. Tomatoes, Rent, Transport"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="form-row">
        {/* Amount */}
        <div className="form-group">
          <label className="form-label" htmlFor="amount">Amount (KES / Shs)</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            className="form-control"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* Quantity (Optional) */}
        <div className="form-group">
          <label className="form-label" htmlFor="quantity">Quantity (Optional)</label>
          <input
            id="quantity"
            type="text"
            className="form-control"
            placeholder="e.g. 2kg, 3 crates"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        {/* Category */}
        <div className="form-group">
          <label className="form-label" htmlFor="category">Category</label>
          <select
            id="category"
            className="form-control"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="inventory">Stock / Inventory</option>
            <option value="rent">Rent</option>
            <option value="transport">Transport / Fuel</option>
            <option value="utilities">Utilities (Tokens/Water)</option>
            <option value="wages">Wages / Helpers</option>
            <option value="packaging">Packaging Bags</option>
            <option value="other">Other Business Costs</option>
          </select>
        </div>

        {/* Date */}
        <div className="form-group">
          <label className="form-label" htmlFor="date">Transaction Date</label>
          <input
            id="date"
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ flex: 2 }}
        >
          <Check size={18} /> {loading ? 'Saving...' : 'Record Transaction'}
        </button>
      </div>
    </form>
  );
};
