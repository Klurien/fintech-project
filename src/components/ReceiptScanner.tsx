import React, { useState } from 'react';
import { parseReceiptWithGemini } from '../utils/gemini';
import { Camera, RefreshCw, AlertCircle, Sparkles, Loader } from 'lucide-react';

interface ReceiptScannerProps {
  onParsed: (parsed: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    quantity: string;
    category: string;
    source: 'receipt';
  }) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onParsed }) => {
  const [loading, setLoading]             = useState<boolean>(false);
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [error, setError]                 = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setParsedPreview(null);
    setImagePreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);
      const parsed = await parseReceiptWithGemini(base64, mimeType);
      setParsedPreview(parsed);
    } catch (err: any) {
      console.error('Gemini Vision error:', err);
      setError('Could not analyse the receipt. Please ensure the image is clear and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedPreview) return;
    onParsed({ ...parsedPreview, source: 'receipt' });
    setParsedPreview(null);
    setImagePreview(null);
  };

  const handleReset = () => {
    setImagePreview(null);
    setParsedPreview(null);
    setError('');
  };

  return (
    <div className="glass-panel ocr-widget-container" style={{ padding: '1.25rem' }}>
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Scan Receipt</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Take or upload a receipt photo — Gemini Vision reads it instantly
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="notification-banner error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Upload area */}
      {!imagePreview ? (
        <label className="upload-area">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <Camera className="upload-icon" size={40} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Upload or Take Photo</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              JPG, PNG — Gemini AI will extract all transaction details
            </p>
          </div>
        </label>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Preview */}
          <div className="ocr-preview-container">
            <img src={imagePreview} alt="Receipt preview" className="ocr-preview-img" />
            {loading && <div className="ocr-scanner-overlay" />}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--grey-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Gemini Vision is reading your receipt…</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Extracting merchant, items, and total amount</p>
              </div>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedPreview && !loading && (
            <div style={{
              background: 'var(--grey-50)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <Sparkles size={13} />
                Gemini Extracted
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Type</div>
                  <span style={{
                    fontWeight: 600,
                    color: parsedPreview.type === 'income' ? 'var(--success)' : 'var(--danger)',
                    textTransform: 'capitalize',
                    fontSize: '0.9rem'
                  }}>
                    {parsedPreview.type}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Amount</div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>KES {parsedPreview.amount?.toLocaleString()}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Description</div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{parsedPreview.description}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Category</div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>{parsedPreview.category}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, height: '42px' }} onClick={handleConfirm}>
                  Confirm & Save
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, height: '42px' }} onClick={handleReset}>
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {/* Reset if no preview yet */}
          {!loading && !parsedPreview && (
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              <RefreshCw size={15} /> Scan Another Receipt
            </button>
          )}
        </div>
      )}
    </div>
  );
};
