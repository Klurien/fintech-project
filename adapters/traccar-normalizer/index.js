'use strict';
const express = require('express');
const { Kafka } = require('kafkajs');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const TOPIC_NORMALIZED = process.env.TOPIC_NORMALIZED || 'tracking_normalized';
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Kafka Setup ──────────────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'traccar-normalizer',
  brokers: KAFKA_BROKERS,
  retry: { retries: 10, initialRetryTime: 3000 }
});

const producer = kafka.producer();

// ─── Normalise Traccar payload → TrackPoint ───────────────────────────────────
//
// Traccar dispatches position updates via HTTP forwarder.
// Example payload (from traccar forward plugin):
//   { deviceId, deviceName, lat, lon, speed, course, altitude, attributes, ... }
//
function normalise(rawPayload) {
  const deviceId = rawPayload.deviceId ?? rawPayload.id ?? 'unknown';
  const deviceName = rawPayload.deviceName ?? rawPayload.name ?? String(deviceId);

  return {
    asset_id: `truck-${deviceId}`,
    display_name: deviceName,
    ts: rawPayload.fixTime
      ? new Date(rawPayload.fixTime).getTime()
      : Date.now(),
    lat: rawPayload.latitude ?? rawPayload.lat ?? 0,
    lon: rawPayload.longitude ?? rawPayload.lon ?? 0,
    speed_kmh: rawPayload.speed ?? 0,         // Traccar gives speed in km/h
    heading: rawPayload.course ?? 0,
    altitude_m: rawPayload.altitude ?? null,
    source: 'traccar',
    mode: 'truck',
    raw_payload: rawPayload,
  };
}

// ─── Express Webhook ──────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '256kb' }));

// Health-check used by Docker and load balancers
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'traccar-normalizer' }));

// Main ingest endpoint — Traccar → forward.url must point here
app.post('/webhook/traccar', async (req, res) => {
  const raw = req.body;

  // Handle both single updates and batched arrays
  const events = Array.isArray(raw) ? raw : [raw];

  try {
    const messages = events.map(ev => {
      const trackPoint = normalise(ev);
      return {
        key: trackPoint.asset_id,
        value: JSON.stringify(trackPoint),
      };
    });

    await producer.send({ topic: TOPIC_NORMALIZED, messages });
    console.log(`[traccar] Published ${messages.length} TrackPoint(s) to ${TOPIC_NORMALIZED}`);
    res.status(202).json({ accepted: messages.length });
  } catch (err) {
    console.error('[traccar] Kafka publish error:', err.message);
    res.status(503).json({ error: 'upstream unavailable' });
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function main() {
  await producer.connect();
  console.log(`[traccar-normalizer] Kafka connected — brokers: ${KAFKA_BROKERS}`);

  app.listen(PORT, () => {
    console.log(`[traccar-normalizer] Webhook listening on http://0.0.0.0:${PORT}/webhook/traccar`);
  });
}

main().catch(err => {
  console.error('[traccar-normalizer] Fatal startup error:', err);
  process.exit(1);
});
