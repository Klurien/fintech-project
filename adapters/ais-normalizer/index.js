'use strict';
const WebSocket = require('ws');
const { Kafka } = require('kafkajs');

// ─── Config ───────────────────────────────────────────────────────────────────
const KAFKA_BROKERS  = (process.env.KAFKA_BROKERS  || 'localhost:9092').split(',');
const TOPIC          = process.env.TOPIC_NORMALIZED || 'tracking_normalized';
const AIS_WS_URL     = process.env.AIS_WS_URL       || 'wss://stream.aisstream.io/v0/stream';
const AIS_API_KEY    = process.env.AIS_API_KEY       || '';          // set in .env / Compose
const BOUNDING_BOX   = JSON.parse(process.env.AIS_BOUNDING_BOX || '[[-90,-180],[90,180]]');
const SIMULATE       = process.env.SIMULATOR_MODE   !== 'false';    // default: simulate

// ─── Kafka ────────────────────────────────────────────────────────────────────
const kafka    = new Kafka({ clientId: 'ais-normalizer', brokers: KAFKA_BROKERS, retry: { retries: 10, initialRetryTime: 3000 } });
const producer = kafka.producer();

// ─── Normalise AIS → TrackPoint ──────────────────────────────────────────────
function normalise(msg) {
  const pos = msg.Message?.PositionReport ?? msg.Message?.StandardClassBPositionReport ?? {};
  const meta = msg.MetaData ?? {};

  return {
    asset_id:     `ship-${meta.MMSI ?? pos.UserID ?? 'unknown'}`,
    display_name: meta.ShipName ?? String(meta.MMSI ?? 'Unknown Ship'),
    ts:           meta.time_utc ? new Date(meta.time_utc).getTime() : Date.now(),
    lat:          pos.Latitude  ?? meta.latitude  ?? 0,
    lon:          pos.Longitude ?? meta.longitude ?? 0,
    speed_kmh:    (pos.Sog ?? 0) * 1.852,     // knots → km/h
    heading:      pos.Cog ?? pos.TrueHeading ?? 0,
    altitude_m:   null,
    source:       'aisstream',
    mode:         'ship',
    raw_payload:  msg,
  };
}

// ─── Simulator (used when AIS_API_KEY is absent or SIMULATOR_MODE=true) ───────
function* generateSimAIS() {
  const ships = [
    { mmsi: '123456789', name: 'MV Atlantic Spirit', lat: 40.70, lon: -74.00 },
    { mmsi: '987654321', name: 'MV Pacific Dawn',    lat: 37.80, lon: -122.50 },
    { mmsi: '555000111', name: 'MV Nordic Wave',     lat: 51.50, lon:   0.10 },
  ];
  let i = 0;
  while (true) {
    const s = ships[i % ships.length];
    yield {
      MetaData: { MMSI: s.mmsi, ShipName: s.name, time_utc: new Date().toISOString() },
      Message: {
        PositionReport: {
          Latitude:  s.lat  + (Math.random() - 0.5) * 0.05,
          Longitude: s.lon  + (Math.random() - 0.5) * 0.05,
          Sog:       Math.random() * 20,
          Cog:       Math.random() * 360,
        }
      }
    };
    i++;
  }
}

async function runSimulator() {
  console.log('[ais] Simulator mode — generating fake AIS positions every 2 s');
  const gen = generateSimAIS();
  while (true) {
    const raw = gen.next().value;
    const tp  = normalise(raw);
    await producer.send({ topic: TOPIC, messages: [{ key: tp.asset_id, value: JSON.stringify(tp) }] });
    console.log(`[ais] sim → ${tp.display_name} @ ${tp.lat.toFixed(4)}, ${tp.lon.toFixed(4)}`);
    await new Promise(r => setTimeout(r, 2000));
  }
}

// ─── Live feed via aisstream.io WebSocket ─────────────────────────────────────
function runLive() {
  console.log(`[ais] Connecting to ${AIS_WS_URL} …`);

  const connect = () => {
    const ws = new WebSocket(AIS_WS_URL);

    ws.on('open', () => {
      console.log('[ais] WebSocket connected — subscribing …');
      ws.send(JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [BOUNDING_BOX],
        FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport'],
      }));
    });

    ws.on('message', async data => {
      try {
        const msg = JSON.parse(data.toString());
        const tp  = normalise(msg);
        if (!tp.lat && !tp.lon) return;          // skip messages with no position
        await producer.send({ topic: TOPIC, messages: [{ key: tp.asset_id, value: JSON.stringify(tp) }] });
        console.log(`[ais] live → ${tp.display_name}`);
      } catch (err) {
        console.error('[ais] parse error:', err.message);
      }
    });

    ws.on('error', err => console.error('[ais] WS error:', err.message));
    ws.on('close', () => {
      console.warn('[ais] WS closed — reconnecting in 5 s …');
      setTimeout(connect, 5000);
    });
  };

  connect();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await producer.connect();
  console.log(`[ais-normalizer] Kafka connected — topic: ${TOPIC}`);

  if (SIMULATE || !AIS_API_KEY) {
    await runSimulator();
  } else {
    runLive();
  }
}

main().catch(err => { console.error('[ais-normalizer] Fatal:', err); process.exit(1); });
