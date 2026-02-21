# AI Support Guide

## 1. Overview

AI support is optional.

When enabled, VideoReview runs a separate `video-analysis` worker
to perform automatic video analysis.

---

## 2. Enable AI (Common Settings)

Set the following values in `.env`:

```env
VIDEO_REVIEW_USE_AI_SUPPORT=true
VIDEO_REVIEW_LOCAL_LLM_DEVICE=auto
VIDEO_ANALYSIS_DEVICE=auto
```

| Value | Description                 |
| ----- | --------------------------- |
| auto  | Automatically select device |
| cpu   | Force CPU mode              |
| cuda  | Use NVIDIA CUDA GPU         |

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
Make sure `VIDEO_REVIEW_LOCAL_ROOTDIR` is properly set.

### Setup & Run
```bash
npm run video-analysis:setup
npm run video-analysis:run
```