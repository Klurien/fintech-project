'use strict';
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export default function MarketChart({ symbol = 'BTC/USDT' }: { symbol?: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      }
    });

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Fetch initial historical data from Binance REST API to populate the chart
    const fetchHistory = async () => {
      try {
        const streamSymbol = symbol.replace('/', '').toUpperCase();
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${streamSymbol}&interval=1m&limit=100`);
        const data = await res.json();
        
        const formattedData = data.map((d: any[]) => ({
          time: (d[0] / 1000) as Time,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        seriesRef.current?.setData(formattedData);
        if (formattedData.length > 0) {
          setCurrentPrice(formattedData[formattedData.length - 1].close);
        }
      } catch (e) {
        console.error("Failed to fetch historical market data", e);
      }
    };

    fetchHistory().then(() => {
      // Connect to Live Binance WebSocket for real-time ticks
      const streamSymbol = symbol.replace('/', '').toLowerCase();
      ws.current = new WebSocket(`wss://stream.binance.com:9443/ws/${streamSymbol}@kline_1m`);

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.k) {
          const kline = message.k;
          const tick = {
            time: (kline.t / 1000) as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };
          
          seriesRef.current?.update(tick);
          
          setCurrentPrice(tick.close);
          const openPrice = parseFloat(kline.o);
          setPriceChange(((tick.close - openPrice) / openPrice) * 100);
        }
      };
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.current?.close();
      chartRef.current?.remove();
    };
  }, [symbol]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#131722] rounded-xl shadow-xl border border-white/5">
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-white font-bold text-lg tracking-wider">{symbol}</span>
        </div>
        {currentPrice !== null && (
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-white font-mono text-2xl">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`font-semibold text-sm ${priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </span>
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="flex-1 w-full h-full pt-20" />
    </div>
  );
}
