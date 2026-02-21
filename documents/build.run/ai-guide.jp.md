# AI Support Guide

## 1. Overview

AIサポートはオプションです

有効にした場合、「video-analysis」Workerが起動し、動画の自動分析を行います

---

## 2. Enable AI (Common Settings)

`.env`に以下の値を設定してください。

```env
VIDEO_REVIEW_USE_AI_SUPPORT=true
VIDEO_REVIEW_LOCAL_LLM_DEVICE=auto
VIDEO_ANALYSIS_DEVICE=auto
```

| Value | Description                 |
| ----- | --------------------------- |
| auto  | デバイス自動選択 |
| cpu   | 強制 CPUモード |
| cuda  | NVIDIA CUDA GPU モード |

---

## 3. Docker Setup

### CPU Mode

```bash

# 1. Build image
docker build -t video-analysis:latest -f docker/video-analysis/Dockerfile.cpu .

# 2. Start video-analysis service
docker compose -f compose.prod.yml -f compose.prod.ai.yml up -d video-analysis

```

### GPU Mode (CUDA Required)
```bash

# 1. Build image
docker build -t video-analysis:latest -f docker/video-analysis/Dockerfile.gpu .

# 2. Start video-analysis service
docker compose -f compose.prod.yml \
               -f compose.prod.ai.yml \
               -f compose.prod.ai.gpu.yml \
               up -d video-analysis
```

---

## 4. Local Setup

### Required Environment
`VIDEO_REVIEW_LOCAL_ROOTDIR` を必ず設定してください

### Setup & Run
```bash
npm run video-analysis:setup
npm run video-analysis:run
```