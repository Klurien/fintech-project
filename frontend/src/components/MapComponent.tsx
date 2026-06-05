'use strict';
'use client';
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const markers = useRef<Map<number, maplibregl.Marker>>(new Map());
  const snapshotTimer = useRef<NodeJS.Timeout | null>(null);

  // We accumulate tracked assets here to periodically snapshot to the DB
  const currentSnapshot = useRef<Map<number, any>>(new Map());

  const [connectionStatus, setConnectionStatus] = useState('Connecting to AIS...');

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-74.0060, 40.7128], // Start near NYC
      zoom: 4,
    });

    map.current.on('load', () => {
      // Connect to real AIS Stream
      const apiKey = process.env.NEXT_PUBLIC_AIS_API_KEY;
      if (!apiKey) {
        setConnectionStatus('Missing NEXT_PUBLIC_AIS_API_KEY in .env.local');
        return;
      }

      ws.current = new WebSocket("wss://stream.aisstream.io/v0/stream");

      ws.current.onopen = () => {
        setConnectionStatus('Live (AIS Connected)');
        const subscriptionMessage = {
          APIKey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]], // Global
          FilterMessageTypes: ["PositionReport"]
        };
        ws.current?.send(JSON.stringify(subscriptionMessage));
      };

      ws.current.onmessage = (event) => {
        const aisMessage = JSON.parse(event.data);
        if (aisMessage["MessageType"] === "PositionReport") {
          const positionReport = aisMessage["Message"]["PositionReport"];
          const metaData = aisMessage["MetaData"];
          
          const mmsi = positionReport["UserID"];
          const lat = positionReport["Latitude"];
          const lon = positionReport["Longitude"];
          
          if (!lat || !lon || lat > 90 || lat < -90) return;

          // Save to snapshot memory
          currentSnapshot.current.set(mmsi, {
            assetId: `ship-${mmsi}`,
            ts: Date.now(),
            lat,
            lon,
            speed: positionReport["Sog"] * 1.852, // knots to kmh
            heading: positionReport["TrueHeading"] || 0,
            name: metaData["ShipName"] ? metaData["ShipName"].trim() : `Ship ${mmsi}`,
            source: 'ais',
            rawPayload: aisMessage
          });

          // Update Map Marker
          if (markers.current.has(mmsi)) {
            markers.current.get(mmsi)?.setLngLat([lon, lat]);
          } else {
            // Cap markers to prevent browser crash
            if (markers.current.size > 1000) return;

            const el = document.createElement('div');
            el.className = 'w-3 h-3 bg-blue-500 rounded-full border border-white shadow-[0_0_10px_rgba(59,130,246,0.8)]';
            
            const marker = new maplibregl.Marker(el)
              .setLngLat([lon, lat])
              .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="text-black p-1">
                  <strong>${metaData["ShipName"] || mmsi}</strong><br/>
                  Speed: ${positionReport["Sog"]} kts
                </div>
              `))
              .addTo(map.current!);
              
            markers.current.set(mmsi, marker);
          }
        }
      };

      ws.current.onerror = () => setConnectionStatus('Connection Error');
      ws.current.onclose = () => setConnectionStatus('Disconnected');
    });

    // Background task to send snapshots to TiDB every 15 seconds
    snapshotTimer.current = setInterval(async () => {
      const payload = Array.from(currentSnapshot.current.values());
      if (payload.length > 0) {
        try {
          await fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          console.log(`[Telemetry] Snapshot saved to TiDB (${payload.length} points)`);
          // Clear current batch
          currentSnapshot.current.clear();
        } catch (e) {
          console.error("Failed to snapshot telemetry to TiDB", e);
        }
      }
    }, 15000);

    return () => {
      ws.current?.close();
      if (snapshotTimer.current) clearInterval(snapshotTimer.current);
      map.current?.remove();
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 right-2 z-10 text-white font-semibold text-xs bg-black/60 px-3 py-1.5 rounded border border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-sm">
        <div className={`w-2 h-2 rounded-full ${connectionStatus.includes('Live') ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {connectionStatus} (Ships: {markers.current.size})
      </div>
      <div ref={mapContainer} className="w-full h-full rounded border border-white/5" />
    </div>
  );
}
