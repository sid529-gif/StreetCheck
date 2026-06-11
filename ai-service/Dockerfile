FROM python:3.11-slim

WORKDIR /app

# System deps for curl (healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip

# Install remaining Python deps (FastAPI, anthropic, Pillow, etc.)
COPY requirements.txt ./
RUN pip install --no-cache-dir \
    --timeout 120 \
    --retries 5 \
    -r requirements.txt

COPY . .

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
