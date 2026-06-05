# Multimodal Transport & Finance Platform

A self-hostable, modular, open-source platform integrating real-time physical multimodal monitoring (trucks, ships, aircraft) with a secure, double-entry financial ledger. 

By unifying telemetry, operations, and accounting, we give retail traders and independent operators a unified operational timeline and P&L view.

## Core Architecture Stack

Our infrastructure leverages a robust, event-driven pattern designed for resilience, decoupled microservices, and massive ingestion scale.

- **Ingestion**: [Traccar](https://www.traccar.org/) (Telematics/Trucks), [libais](https://github.com/schwehr/libais) (Ships), [dump1090](https://github.com/flightaware/dump1090) (Aircraft), [CCXT](https://docs.ccxt.com/) (Crypto/Markets)
- **Event Bus**: [Apache Kafka](https://kafka.apache.org/) - Handles telemetry streams, decoupled events, and ledger mapping queues.
- **Data & Storage**: 
  - **[TimescaleDB](https://www.timescale.com/)** (Postgres) - Time-series optimization for millions of track points and metric rollups.
  - **[MinIO](https://min.io/)** - Self-hosted S3-compatible object storage for receipts and voice memos.
- **Double-Entry Ledger**: [Beancount](https://beancount.github.io/) / Custom Postgres WAL with cryptographic signing to ensure immutable, verifiable accounting.
- **AI / Automation**: [Tesseract.js](https://tesseract.projectnaptha.com/) for receipt OCR and [Whisper](https://github.com/openai/whisper) ( Transformers.js) for voice-to-text dictation.
- **Frontend SPA**: React, Next.js, [MapLibre](https://maplibre.org/) (Unified maps), [Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (Market data), and CouchDB/PouchDB for offline resilience.

## Local Quick Start

To spin up the core data plane and the frontend locally, execute the compose environment:

```bash
cd infra
docker-compose up -d
```
*Note: This starts Kafka, TimescaleDB, MinIO, and placeholder containers for Traccar and Dump1090.*

Followed by running your Next.js application:

```bash
cd frontend
npm run dev
```

---

## 🎯 Next Steps: Top 10 Adapter implementation Tickets

To finalize our robust pipeline, we are actively implementing the following integration adapters. Pick a ticket below to start contributing:

1. **[TICKET-001] Traccar GPS Normalizer**: Create a Kafka consumer that reads Traccar's raw JSON events, extracts `(MMSI/IMEI, lat, lon, speed)`, and publishes standardized `TrackPoint` payloads.
2. **[TICKET-002] dump1090 SDR Ingest**: Deploy `dump1090` in local Docker, tap its port 30005 raw output, and pipe ADS-B aircraft data into the `adsb_raw` Kafka topic.
3. **[TICKET-003] ais-stream Receiver**: Build an adapter that connects to the `aisstream.io` websocket and pipes ship coordinates to the `ais_raw` Kafka topic.
4. **[TICKET-004] TimescaleDB Sink Adapter**: Write a Go or Node.js microservice that consumes all `TrackPoint` messages from Kafka and inserts them into our partitioned Postgres/Timescale database.
5. **[TICKET-005] CCXT Live Ticker Adapter**: Hook up `ccxt` to scrape BTC/USDT and TSLA endpoints and publish price updates to the `market_ticks` topic at 1Hz.
6. **[TICKET-006] MinIO Upload Broker**: Connect the Next.js Dropzone UI (`ReceiptDropzone.tsx`) to MinIO. Store the raw image and push an `ImageUploaded` event onto Kafka.
7. **[TICKET-007] Tesseract OCR Worker**: Consume `ImageUploaded` events. Pull the image from MinIO, process via OCR, and push a `ReceiptParsed` JSON event via Kafka.
8. **[TICKET-008] spaCy NLP Normalizer**: Consume `ReceiptParsed` or `VoiceDictation` events, use `spaCy` to extract Entities (Vendor, Date, TotalAmount), and publish a `LedgerSuggestion` event.
9. **[TICKET-009] Event-to-Journal Microservice**: Consume `LedgerSuggestion` events via a manual approval UI. Map them to static Beancount/Postgres accounts and inject the final transaction into the Double-Entry SQL core.
10. **[TICKET-010] PouchDB Offline Sync Cache**: Integrate PouchDB into the frontend so new Voice Memos and Receipts taken without internet connection natively sync to CouchDB/Kafka when connectivity is restored.
