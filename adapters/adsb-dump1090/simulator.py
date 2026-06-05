import json
import time
import random

def generate_mock_adsb():
    """Generates a mock dump1090-style JSON message."""
    hex_id = f"{random.randint(0x100000, 0xFFFFFF):06x}"
    lat = 37.7749 + random.uniform(-1, 1)
    lon = -122.4194 + random.uniform(-1, 1)
    speed = random.uniform(200, 500)
    heading = random.uniform(0, 360)
    
    return {
        "hex": hex_id,
        "flight": f"FL{random.randint(100, 999)}",
        "lat": lat,
        "lon": lon,
        "alt_baro": random.randint(10000, 40000),
        "gs": speed,
        "track": heading,
        "category": "A1"
    }

def stream_simulated_adsb():
    """Yields mock ADS-B messages continuously."""
    print("Starting simulated ADS-B stream...")
    while True:
        yield generate_mock_adsb()
        time.sleep(1.0)  # 1 message per second

if __name__ == "__main__":
    for msg in stream_simulated_adsb():
        print(json.dumps(msg))
