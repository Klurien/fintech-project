import os
import json
import time
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from confluent_kafka import Producer
from simulator import stream_simulated_adsb

class TrackPoint(BaseModel):
    asset_id: str
    ts: int  # Unix timestamp in milliseconds
    lat: float
    lon: float
    speed: float
    heading: float
    source: str
    raw_payload: Dict[str, Any]

def delivery_report(err, msg):
    """Called once for each message produced to indicate delivery result."""
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def main():
    bootstrap_servers = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
    is_simulator = os.environ.get('SIMULATOR_MODE', 'true').lower() == 'true'
    topic = 'ingest_adsb'

    print(f"Starting ADS-B adapter (Simulator: {is_simulator})")
    print(f"Connecting to Kafka at {bootstrap_servers}")

    producer_conf = {'bootstrap.servers': bootstrap_servers}
    producer = Producer(producer_conf)

    if is_simulator:
        for raw_msg in stream_simulated_adsb():
            try:
                # Normalize dump1090 to TrackPoint
                track_point = TrackPoint(
                    asset_id=raw_msg['hex'],
                    ts=int(time.time() * 1000),
                    lat=raw_msg['lat'],
                    lon=raw_msg['lon'],
                    speed=raw_msg.get('gs', 0.0),
                    heading=raw_msg.get('track', 0.0),
                    source='adsb-dump1090',
                    raw_payload=raw_msg
                )

                payload = track_point.model_dump_json()
                
                # Publish to Kafka
                producer.produce(
                    topic, 
                    value=payload.encode('utf-8'), 
                    callback=delivery_report
                )
                producer.poll(0)
                
            except Exception as e:
                print(f"Error processing message: {e}")
                
    else:
        print("Live capture not implemented for Sprint 0. Set SIMULATOR_MODE=true.")

    producer.flush()

if __name__ == '__main__':
    main()
