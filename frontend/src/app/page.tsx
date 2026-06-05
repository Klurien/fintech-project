import React from 'react';
import { Activity, Map, PieChart, Receipt, BookOpen, Mic } from 'lucide-react';
import MarketChart from '@/components/MarketChart';
import MapComponent from '@/components/MapComponent';
import ReceiptDropzone from '@/components/ReceiptDropzone';
import LedgerFeed from '@/components/LedgerFeed';
import VoiceInbox from '@/components/VoiceInbox';
export default function Dashboard() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-64 border-r border-white/10 flex flex-col p-4 space-y-6">
        <div className="text-xl font-bold tracking-wider text-primary mb-4">
          RETAIL<span className="text-white">TRACK</span>
        </div>
        
        <div className="space-y-2 flex-grow">
          <NavItem icon={<Activity />} label="Markets" active />
          <NavItem icon={<Map />} label="Fleet GPS & AIS" />
          <NavItem icon={<BookOpen />} label="General Ledger" />
          <NavItem icon={<Receipt />} label="Receipt OCR" />
          <NavItem icon={<Mic />} label="Voice Inbox" />
          <NavItem icon={<PieChart />} label="Analytics" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-light tracking-tight">Live Markets & Telemetry</h1>
          <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-sm border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            System Online (TiDB Connected)
          </div>
        </header>

        {/* Top Widgets: Charts and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
          {/* Chart UI Container */}
          <div className="glass-panel p-4 flex flex-col">
            <h2 className="text-lg text-gray-400 mb-2">BTC/USDT (CCXT Live)</h2>
            <div className="flex-1 rounded border border-white/5 overflow-hidden">
              <MarketChart symbol="BTC-USDT" />
            </div>
          </div>

          {/* Map UI Container */}
          <div className="glass-panel p-4 flex flex-col">
            <h2 className="text-lg text-gray-400 mb-2">Live AIS & Global Telemetry</h2>
            <div className="flex-1 rounded border border-white/5 overflow-hidden">
              <MapComponent />
            </div>
          </div>
        </div>

        {/* Lower Section: Ledger and Inbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[300px]">
          <div className="glass-panel p-4 lg:col-span-1">
            <h2 className="text-lg text-gray-400 mb-2">Recent Ledger Entries</h2>
            <div className="h-[calc(100%-2rem)]">
              <LedgerFeed />
            </div>
          </div>
          
          <div className="glass-panel p-4 pb-8 lg:col-span-1">
            <h2 className="text-lg text-gray-400 mb-2">OCR Dropzone</h2>
            <div className="h-[calc(100%-2rem)]">
              <ReceiptDropzone />
            </div>
          </div>

          <div className="glass-panel p-4 lg:col-span-1">
            <h2 className="text-lg text-gray-400 mb-2">Voice Inbox (Local AI)</h2>
            <div className="h-[calc(100%-2rem)]">
              <VoiceInbox />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${active ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      <span className="w-5 h-5">{icon}</span>
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );
}
