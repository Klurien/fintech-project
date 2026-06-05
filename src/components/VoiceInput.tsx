import React, { useState, useEffect, useRef } from 'react';
import { parseVoiceCommand, type ParsedTransaction } from '../utils/nlpParser';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface VoiceInputProps {
  onParsed: (parsed: Omit<ParsedTransaction, 'category'> & { source: 'voice'; category: string }) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onParsed }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [supported, setSupported] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US'; // Matches standard voice commands in English

      rec.onstart = () => {
        setIsRecording(true);
        setErrorMsg('');
        setTranscript('Listening for transaction...');
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
        if (e.error === 'no-speech') {
          setErrorMsg('No speech was detected. Please try again.');
        } else if (e.error === 'not-allowed') {
          setErrorMsg('Microphone access denied. Please check permission settings.');
        } else {
          setErrorMsg(`Error occurred: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.onresult = (e: any) => {
        const resultText = e.results[0][0].transcript;
        setTranscript(resultText);
        
        // Parse the spoken text
        const parsed = parseVoiceCommand(resultText);
        
        // Callback with source set to 'voice'
        onParsed({
          ...parsed,
          source: 'voice'
        });
      };

      recognitionRef.current = rec;
    }
  }, [onParsed]);

  const toggleRecording = () => {
    if (!supported || !recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setErrorMsg('');
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        console.error('Failed to start recognition:', err);
        setErrorMsg('Could not initialize microphone.');
      }
    }
  };

  if (!supported) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
        <h4>Voice Commands Not Supported</h4>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Your browser does not support voice recognition. Please try Chrome, Edge, or Safari, or enter transactions manually.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel voice-widget-container">
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Voice Ledger</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Record transactions instantly by speaking
        </p>
      </div>

      <button
        type="button"
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        onClick={toggleRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? <MicOff size={36} /> : <Mic size={36} />}
      </button>

      <span className="voice-status">
        {isRecording ? 'Recording Now...' : 'Tap Mic to Speak'}
      </span>

      {errorMsg && (
        <div className="notification-banner error" style={{ width: '100%', margin: 0 }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {transcript && (
        <div className="voice-transcript-box">
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      <div className="voice-tips">
        <span style={{ fontWeight: 600 }}>Try saying:</span>
        <span>&bull; &ldquo;Sold 2 kilograms of sugar for 300 shillings&rdquo;</span>
        <span>&bull; &ldquo;Bought stock transport for 500 shillings&rdquo;</span>
        <span>&bull; &ldquo;Paid shop rent 2500 shillings&rdquo;</span>
      </div>
    </div>
  );
};
