'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export default function VoiceInbox() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [progress, setProgress] = useState(100);
  const [status, setStatus] = useState('ready');

  const worker = useRef<Worker | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    // Initialize Web Worker
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });

      worker.current.addEventListener('message', (e) => {
        const data = e.data;
        if (data.status === 'initiate') {
          setStatus('Loading model...');
          setProgress(0);
        } else if (data.status === 'progress') {
          setProgress(data.progress || 0);
          setStatus(`Downloading AI model: ${Math.round(data.progress || 0)}%`);
        } else if (data.status === 'done') {
          setStatus('ready');
          setProgress(100);
        } else if (data.status === 'ready') {
          setStatus('ready');
          setProgress(100);
        } else if (data.status === 'complete') {
          setTranscript(data.output.text);
          setIsProcessing(false);
        }
      });
    }

    return () => {
      if (worker.current) {
        worker.current.terminate();
        worker.current = null;
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        // Decode audio to 16kHz Float32Array for Whisper model
        const arrayBuffer = await audioBlob.arrayBuffer();
        const AudioContextCls = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextCls({ sampleRate: 16000 });
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        const audio = decoded.getChannelData(0);

        if (worker.current) {
          worker.current.postMessage({ audio });
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/5 rounded-xl border border-white/10 p-4 relative overflow-hidden">
      {status !== 'ready' && status !== 'complete' && progress < 100 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
      
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        {isProcessing ? (
          <div className="flex flex-col items-center text-primary animate-pulse w-full">
            <Loader2 className="w-12 h-12 animate-spin mb-2" />
            <span className="text-sm font-medium tracking-wide text-center">Processing local inference... ({status})</span>
          </div>
        ) : (
          <>
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)]
                ${isRecording 
                  ? 'bg-red-500/20 text-red-500 border-2 border-red-500/50 hover:bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse' 
                  : 'bg-primary/20 text-primary border-2 border-primary/50 hover:bg-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                }`}
            >
              {isRecording ? <Square fill="currentColor" className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <div className="text-sm text-gray-400 font-medium h-4">
              {isRecording ? 'Recording... click to transcribe' : 'Click to dictate a ledger event'}
            </div>
            {status !== 'ready' && progress < 100 && (
              <div className="text-xs text-emerald-400 font-semibold">{status}</div>
            )}
          </>
        )}
      </div>

      {transcript && !isProcessing && (
        <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/5 text-sm text-gray-300">
          <div className="text-xs text-primary mb-1 uppercase tracking-wider font-bold">Transcription</div>
          {transcript}
        </div>
      )}
    </div>
  );
}
