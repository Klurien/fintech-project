'use strict';
const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');

// ─── Config ───────────────────────────────────────────────────────────────────
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const TOPIC         = process.env.TOPIC_NORMALIZED || 'tracking_normalized';
const CONSUMER_GROUP= process.env.CONSUMER_GROUP || 'timescale-sink-group';

// ─── Clients ──────────────────────────────────────────────────────────────────
const kafka = new Kafka({ clientId: 'timescale-sink', brokers: KAFKA_BROKERS });
const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
const prisma = new PrismaClient();

// ─── Main Processing Loop ─────────────────────────────────────────────────────
async function main() {
  await prisma.$connect();
  console.log('[timescale-sink] Prisma connected to PostgreSQL/TimescaleDB.');

  await consumer.connect();
  console.log(`[timescale-sink] Kafka consumer connected to brokers: ${KAFKA_BROKERS}`);

  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        
        // Ensure the Asset exists
        const asset = await prisma.asset.upsert({
          where: { id: payload.asset_id },
          update: {},
          create: {
            id: payload.asset_id,
            type: payload.mode || 'unknown',
            registration: payload.display_name || payload.asset_id,
            ownerId: 'system', // Default system owner for external feeds
            metadata: { source: payload.source }
          }
        });

        // Insert the TrackPoint
        await prisma.trackPoint.create({
          data: {
            ts: new Date(payload.ts),
            lat: payload.lat,
            lon: payload.lon,
            speed: payload.speed_kmh || payload.speed || 0,
            heading: payload.heading || 0,
            source: payload.source || 'unknown',
            rawPayload: payload.raw_payload || {},
            assetId: asset.id
          }
        });

        console.log(`[timescale-sink] Wrote TrackPoint for ${asset.id} @ ${payload.lat}, ${payload.lon}`);
      } catch (err) {
        console.error(`[timescale-sink] Error processing message:`, err.message);
      }
    },
  });
}

main().catch(async (err) => {
  console.error('[timescale-sink] Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
