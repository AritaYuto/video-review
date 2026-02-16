FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    gcc \
    g++ \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/integrations/video-analysis

COPY integrations/video-analysis/requirements_cpu.txt /tmp/requirements_cpu.txt

RUN pip install --upgrade pip \
    && pip install -r /tmp/requirements_cpu.txt

COPY integrations/video-analysis /app/integrations/video-analysis

CMD ["python", "run_worker.py"]
