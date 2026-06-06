import React, { useState, useEffect, useRef } from 'react';
import { parseVoiceWithGemini } from '../utils/gemini';
import { Mic, MicOff, AlertCircle, Loader, Sparkles } from 'lucide-react';

interface VoiceInputProps {
  onParsed: (parsed: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    quantity: string;
    category: string;
    source: 'voice';
  }) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onParsed }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript]   = useState<string>('');
  const [supported, setSupported]     = useState<boolean>(true);
  const [errorMsg, setErrorMsg]       = useState<string>('');
  const [parsing, setParsing]         = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.lang            = 'en-US';

    rec.onstart = () => {
      setIsRecording(true);
      setErrorMsg('');
      setParsedPreview(null);
      setTranscript('Listening...');
    };

    rec.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error === 'no-speech')    setErrorMsg('No speech detected. Please try again.');
      else if (e.error === 'not-allowed') setErrorMsg('Microphone access denied. Check your browser permissions.');
      else setErrorMsg(`Error: ${e.error}`);
    };

    rec.onend = () => setIsRecording(false);

    rec.onresult = async (e: any) => {
      const resultText = e.results[0][0].transcript;
      setTranscript(resultText);
      setParsing(true);
      setErrorMsg('');

      try {
        const parsed = await parseVoiceWithGemini(resultText);
        setParsedPreview(parsed);
      } catch (err: any) {
        console.error('Gemini parse error:', err);
        setErrorMsg('AI parsing failed. Please try again or add manually.');
      } finally {
        setParsing(false);
      }
    };

    recognitionRef.current = rec;
  }, []);

  const toggleRecording = () => {
    if (!supported || !recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setErrorMsg('');
      setParsedPreview(null);
      try {
        recognitionRef.current.start();
      } catch {
        setErrorMsg('Could not start microphone.');
      }
    }
  };

  const handleConfirm = () => {
    if (!parsedPreview) return;
    onParsed({ ...parsedPreview, source: 'voice' });
    setParsedPreview(null);
    setTranscript('');
  };

  const handleDiscard = () => {
    setParsedPreview(null);
    setTranscript('');
  };

  if (!supported) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
        <h4>Voice Not Supported</h4>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Your browser doesn't support voice input. Please use Chrome, Edge, or Safari — or enter transactions manually.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel voice-widget-container">
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Voice Entry</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Speak a transaction — Gemini AI will extract the details automatically
        </p>
      </div>

      {/* Mic Button */}
      <button
        type="button"
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        onClick={toggleRecording}
        disabled={parsing}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
      </button>

      <span className="voice-status">
        {isRecording ? 'Recording… tap to stop' : parsing ? 'Analysing with Gemini AI…' : 'Tap mic to speak'}
      </span>

      {/* Error */}
      {errorMsg && (
        <div className="notification-banner error" style={{ width: '100%', margin: 0 }}>
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Transcript */}
      {transcript && !parsing && transcript !== 'Listening...' && (
        <div className="voice-transcript-box">
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Parsing spinner */}
      {parsing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <Loader size={16} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Gemini is reading your transaction…</span>
        </div>
      )}

      {/* Parsed Preview Card */}
      {parsedPreview && !parsing && (
        <div style={{
          width: '100%',
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
            {parsedPreview.quantity && (
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Quantity</div>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{parsedPreview.quantity}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, height: '42px' }} onClick={handleConfirm}>
              Confirm & Save
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, height: '42px' }} onClick={handleDiscard}>
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      {!parsedPreview && !parsing && (
        <div className="voice-tips">
          <span style={{ fontWeight: 600 }}>Try saying:</span>
          <span>&bull; &ldquo;Sold 2 kilograms of sugar for 300 shillings&rdquo;</span>
          <span>&bull; &ldquo;Bought stock transport for 500 shillings&rdquo;</span>
          <span>&bull; &ldquo;Paid shop rent 2500 shillings&rdquo;</span>
        </div>
      )}
    </div>
  );
};
