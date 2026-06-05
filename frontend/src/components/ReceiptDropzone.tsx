'use client';
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function ReceiptDropzone() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // Process photo directly in the browser!
      const worker = await Tesseract.createWorker('eng');
      const ret = await worker.recognize(file);
      setResult(ret.data.text);
      await worker.terminate();

      // Submit the text to our TiDB ledger API for classification
      // await fetch('/api/ledger/receipt', { method: 'POST', body: JSON.stringify({text: ret.data.text})});
      
    } catch (err) {
      console.error(err);
      setResult('Error processing document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-2">
      <div 
        className="flex-1 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-400 mb-2" />
        <span className="text-sm text-gray-400">{isProcessing ? 'Running Tesseract OCR...' : 'Click to Upload Receipt Photo'}</span>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
      </div>
      
      {result && (
        <div className="h-24 bg-black/40 border border-white/10 rounded overflow-y-auto p-2 text-xs text-green-400 font-mono">
          {result}
        </div>
      )}
    </div>
  );
}
