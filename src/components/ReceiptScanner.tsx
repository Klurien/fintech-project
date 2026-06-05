import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '../utils/ocrParser';
import { Camera, RefreshCw, AlertCircle, FileText } from 'lucide-react';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setImagePreview(URL.createObjectURL(file));
    runOCR(file);
  };

  const runOCR = async (file: File) => {
    setLoading(true);
    setProgress(0);

    try {
      // Run OCR completely inside the browser using Tesseract.js
      // Under online conditions, this downloads/caches the model.
      // Under offline conditions, it uses the cached model.
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const parsedData = parseReceiptText(result.data.text);

      onParsed({
        type: 'expense', // Receipts are categorized as expenses by default
        amount: parsedData.amount,
        description: parsedData.merchant,
        quantity: '',
        category: 'other',
        source: 'receipt'
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError('Failed to extract text. Please ensure the image is bright and text is clear.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setProgress(0);
    setError('');
  };

  return (
    <div className="glass-panel ocr-widget-container" style={{ padding: '1.25rem' }}>
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Scan Receipt</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Snap a photo of your purchase receipt to automatically record expenses
        </p>
      </div>

      {error && (
        <div className="notification-banner error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!imagePreview ? (
        <label className="upload-area">
          <input
            type="file"
            accept="image/*"
            capture="environment" /* Requests mobile camera directly */
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <Camera className="upload-icon" size={40} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Upload or Take Photo</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Supports JPG, PNG, and Mobile camera captures
            </p>
          </div>
        </label>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Photo Preview Container with scan animation if scanning */}
          <div className="ocr-preview-container">
            <img src={imagePreview} alt="Receipt preview" className="ocr-preview-img" />
            {loading && <div className="ocr-scanner-overlay"></div>}
          </div>

          {/* OCR Parsing Progress */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Extracting Receipt Text...</span>
                <span>{progress}%</span>
              </div>
              <div className="ocr-progress-bar-container">
                <div className="ocr-progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {!loading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ width: '100%' }}
            >
              <RefreshCw size={16} /> Scan Another Receipt
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
        <FileText size={16} style={{ color: 'var(--primary)', marginTop: '0.1rem', flexShrink: 0 }} />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          <strong>Offline Tip:</strong> First scan requires internet to download language libraries. Once downloaded, scanning works completely offline!
        </p>
      </div>
    </div>
  );
};
