'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Activity, Map, BookOpen, Receipt, Mic, PieChart,
  TrendingUp, Ship, Truck, Plane, Zap, Bell, Settings,
  ChevronRight, BarChart3, Globe, DollarSign, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import LedgerFeed from '@/components/LedgerFeed';
import VoiceInbox from '@/components/VoiceInbox';
import ReceiptDropzone from '@/components/ReceiptDropzone';

// Dynamically import heavy client components to avoid SSR issues
const MarketChart = dynamic(() => import('@/components/MarketChart'), { ssr: false, loading: () => <ChartSkeleton /> });
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false, loading: () => <MapSkeleton /> });

// ── Skeletons ─────────────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="w-full h-full bg-white/5 rounded-xl animate-pulse flex items-center justify-center">
    <BarChart3 className="w-12 h-12 text-white/10" />
  </div>
);
const MapSkeleton = () => (
  <div className="w-full h-full bg-white/5 rounded-xl animate-pulse flex items-center justify-center">
    <Globe className="w-12 h-12 text-white/10" />
  </div>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type View = 'markets' | 'map' | 'ledger' | 'ocr' | 'voice' | 'analytics';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, change, changeType }: {
  icon: React.ReactNode; label: string; value: string; change?: string; changeType?: 'up' | 'down';
}) {
  return (
    <div className="stat-card group cursor-default">
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/8 transition-colors">
          {icon}
        </div>
        {change && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold font-mono-num ${changeType === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold font-mono-num tracking-tight text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-item w-full ${active ? 'active' : ''}`}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/20">
          {badge}
        </span>
      )}
      {active && <ChevronRight className="w-3 h-3 opacity-50" />}
    </button>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('markets');
  const [time, setTime] = useState('');
  const [btcSymbol, setBtcSymbol] = useState('BTC/USDT');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen bg-mesh text-foreground overflow-hidden">
      
      {/* ── Sidebar ── */}
      <aside className="w-60 flex flex-col flex-shrink-0 border-r border-white/5 py-5 px-3 gap-6">
        {/* Logo */}
        <div className="px-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gradient-purple tracking-wide">RetailTrack</p>
            <p className="text-[10px] text-slate-600 font-medium">Multimodal Pro</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1">Platform</p>
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="Live Markets" active={activeView === 'markets'} onClick={() => setActiveView('markets')} badge="LIVE" />
          <NavItem icon={<Map className="w-4 h-4" />} label="Fleet & AIS Map" active={activeView === 'map'} onClick={() => setActiveView('map')} badge="LIVE" />
          <NavItem icon={<BookOpen className="w-4 h-4" />} label="General Ledger" active={activeView === 'ledger'} onClick={() => setActiveView('ledger')} />
          
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1 mt-4">Tools</p>
          <NavItem icon={<Receipt className="w-4 h-4" />} label="Receipt OCR" active={activeView === 'ocr'} onClick={() => setActiveView('ocr')} />
          <NavItem icon={<Mic className="w-4 h-4" />} label="Voice Inbox" active={activeView === 'voice'} onClick={() => setActiveView('voice')} />
          <NavItem icon={<PieChart className="w-4 h-4" />} label="Analytics" active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} />
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 pt-4 px-2 space-y-3">
          <div className="flex items-center gap-2">
            <div className="pulse-dot green" />
            <span className="text-xs text-slate-500 font-mono-num">TiDB Connected</span>
          </div>
          <div className="text-xs text-slate-600 font-mono-num">{time} UTC+3</div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">
              {activeView === 'markets' && 'Live Markets & Telemetry'}
              {activeView === 'map' && 'Global Fleet & Maritime Tracker'}
              {activeView === 'ledger' && 'General Ledger'}
              {activeView === 'ocr' && 'Receipt OCR Scanner'}
              {activeView === 'voice' && 'Voice Inbox'}
              {activeView === 'analytics' && 'Analytics'}
            </h1>
            <p className="text-xs text-slate-500">Real-time data pipeline · TiDB · Vercel</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="badge-live">
              <div className="pulse-dot green w-1.5 h-1.5" />
              All Systems Operational
            </div>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-500 hover:text-white">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-500 hover:text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Markets View ── */}
        {activeView === 'markets' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Stat Row */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard icon={<DollarSign className="w-4 h-4 text-purple-400" />} label="BTC/USDT" value="$—" change="live" changeType="up" />
              <StatCard icon={<Ship className="w-4 h-4 text-blue-400" />} label="Ships Tracked" value="—" change="AIS" changeType="up" />
              <StatCard icon={<Truck className="w-4 h-4 text-emerald-400" />} label="Fleet Vehicles" value="—" change="GPS" changeType="up" />
              <StatCard icon={<Plane className="w-4 h-4 text-amber-400" />} label="Aircraft ADS-B" value="—" change="LIVE" changeType="up" />
            </div>

            {/* Symbol selector */}
            <div className="flex gap-2">
              {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'].map(s => (
                <button
                  key={s}
                  onClick={() => setBtcSymbol(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 font-mono-num ${btcSymbol === s ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-slate-500 hover:text-white border border-transparent'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Chart + Map grid */}
            <div className="grid grid-cols-2 gap-5 h-[380px]">
              <div className="glass-panel overflow-hidden">
                <MarketChart symbol={btcSymbol} />
              </div>
              <div className="glass-panel overflow-hidden">
                <MapComponent />
              </div>
            </div>

            {/* Lower row */}
            <div className="grid grid-cols-3 gap-5 min-h-[280px]">
              <div className="glass-panel p-4 col-span-1 flex flex-col">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Recent Ledger Entries
                </h2>
                <div className="flex-1 overflow-hidden">
                  <LedgerFeed />
                </div>
              </div>
              <div className="glass-panel p-4 col-span-1 flex flex-col">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" /> OCR Receipt Drop
                </h2>
                <div className="flex-1 overflow-hidden">
                  <ReceiptDropzone />
                </div>
              </div>
              <div className="glass-panel p-4 col-span-1 flex flex-col">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5" /> Voice Inbox
                </h2>
                <div className="flex-1 overflow-hidden">
                  <VoiceInbox />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Map View ── */}
        {activeView === 'map' && (
          <div className="flex-1 p-5 flex flex-col gap-5">
            <div className="grid grid-cols-4 gap-4">
              <StatCard icon={<Ship className="w-4 h-4 text-blue-400" />} label="Ships via AIS" value="Live" change="Global" changeType="up" />
              <StatCard icon={<Truck className="w-4 h-4 text-emerald-400" />} label="Traccar Vehicles" value="—" change="GPS" changeType="up" />
              <StatCard icon={<Plane className="w-4 h-4 text-amber-400" />} label="Aircraft ADS-B" value="—" change="SDR" changeType="up" />
              <StatCard icon={<Activity className="w-4 h-4 text-purple-400" />} label="Data Freshness" value="< 2s" change="live" changeType="up" />
            </div>
            <div className="flex-1 glass-panel overflow-hidden">
              <MapComponent />
            </div>
          </div>
        )}

        {/* ── Ledger View ── */}
        {activeView === 'ledger' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="glass-panel p-6 h-full">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Double-Entry General Ledger (TiDB)
              </h2>
              <LedgerFeed />
            </div>
          </div>
        )}

        {/* ── OCR View ── */}
        {activeView === 'ocr' && (
          <div className="flex-1 p-5 flex items-center justify-center">
            <div className="glass-panel p-8 w-full max-w-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> OCR Receipt Scanner (Tesseract.js)
              </h2>
              <ReceiptDropzone />
            </div>
          </div>
        )}

        {/* ── Voice View ── */}
        {activeView === 'voice' && (
          <div className="flex-1 p-5 flex items-center justify-center">
            <div className="glass-panel p-8 w-full max-w-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Mic className="w-4 h-4" /> Voice Inbox (Whisper AI)
              </h2>
              <VoiceInbox />
            </div>
          </div>
        )}

        {/* ── Analytics View ── */}
        {activeView === 'analytics' && (
          <div className="flex-1 p-5 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-5 h-[380px]">
              <div className="glass-panel overflow-hidden">
                <MarketChart symbol="BTC/USDT" />
              </div>
              <div className="glass-panel overflow-hidden">
                <MarketChart symbol="ETH/USDT" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 h-[300px]">
              <div className="glass-panel overflow-hidden">
                <MarketChart symbol="SOL/USDT" />
              </div>
              <div className="glass-panel overflow-hidden">
                <MarketChart symbol="XRP/USDT" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
