FROM python:3.11-slim

WORKDIR /app

# Install required system dependencies for confluent-kafka
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ libc6-dev && \
    rm -rf /var/lib/apt/lists/*

COPY adapters/adsb-dump1090/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY adapters/adsb-dump1090/ .

# Ensure unbuffered logs
ENV PYTHONUNBUFFERED=1

CMD ["python", "adapter.py"]
