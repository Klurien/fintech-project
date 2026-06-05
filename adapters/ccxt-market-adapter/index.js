'use strict';
const ccxt   = require('ccxt');
const { Kafka } = require('kafkajs');

// ─── Config ───────────────────────────────────────────────────────────────────
const KAFKA_BROKERS  = (process.env.KAFKA_BROKERS  || 'localhost:9092').split(',');
const TOPIC          = process.env.TOPIC_MARKET    || 'market_ticks';
const EXCHANGE_ID    = process.env.CCXT_EXCHANGE   || 'binance';
const SYMBOLS        = (process.env.CCXT_SYMBOLS   || 'BTC/USDT,ETH/USDT,SOL/USDT,XRP/USDT').split(',');
const POLL_INTERVAL  = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);

// ─── Kafka ────────────────────────────────────────────────────────────────────
const kafka    = new Kafka({ clientId: 'ccxt-market-adapter', brokers: KAFKA_BROKERS, retry: { retries: 10, initialRetryTime: 3000 } });
const producer = kafka.producer();

// ─── CCXT exchange instance ───────────────────────────────────────────────────
function buildExchange() {
  const ExchangeClass = ccxt[EXCHANGE_ID];
  if (!ExchangeClass) throw new Error(`Unknown CCXT exchange: ${EXCHANGE_ID}`);
  return new ExchangeClass({ enableRateLimit: true });
}

// ─── Normalise OHLCV / ticker → MarketTick ───────────────────────────────────
function normaliseTicker(symbol, ticker) {
  return {
    symbol,
    exchange:  EXCHANGE_ID,
    ts:        ticker.timestamp ?? Date.now(),
    open:      ticker.open,
    high:      ticker.high,
    low:       ticker.low,
    close:     ticker.last,
    volume:    ticker.baseVolume,
    bid:       ticker.bid,
    ask:       ticker.ask,
    change_pct: ticker.percentage,
  };
}

// ─── Poll loop ────────────────────────────────────────────────────────────────
async function pollTickers(exchange) {
  while (true) {
    const messages = [];

    for (const symbol of SYMBOLS) {
      try {
        const ticker = await exchange.fetchTicker(symbol);
        const tick   = normaliseTicker(symbol, ticker);
        messages.push({ key: symbol.replace('/', '-'), value: JSON.stringify(tick) });
        console.log(`[ccxt] ${symbol} → close: ${tick.close} change: ${tick.change_pct?.toFixed(2)}%`);
      } catch (err) {
        console.warn(`[ccxt] Failed to fetch ${symbol}: ${err.message}`);
      }
    }

    if (messages.length > 0) {
      await producer.send({ topic: TOPIC, messages });
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const exchange = buildExchange();
  await producer.connect();
  console.log(`[ccxt-adapter] Exchange: ${EXCHANGE_ID} | Symbols: ${SYMBOLS.join(', ')}`);
  console.log(`[ccxt-adapter] Publishing to "${TOPIC}" every ${POLL_INTERVAL}ms`);
  await pollTickers(exchange);
}

main().catch(err => { console.error('[ccxt-adapter] Fatal:', err); process.exit(1); });
