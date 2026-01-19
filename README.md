<!-- HERO -->
<div align="center">

  <h1>VideoReview</h1>

  <p>
    A self-hosted video review hub for small-to-mid teams.
    <br/>
    Comment on timelines, draw on frames, and connect feedback to action.
  </p>

  <!-- Buttons -->
  <p>
    <a href="https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/" target="_blank" rel="noopener noreferrer">
      <img alt="Start Demo" src="https://img.shields.io/badge/Start%20Demo-Open-blue?style=for-the-badge" />
    </a>
    <a href="./documents/en/README.md">
      <img alt="Documentation" src="https://img.shields.io/badge/Documentation-Open-3369b4?style=for-the-badge" />
    </a>
    <a href="./README.jp.md">
      <img alt="日本語 README" src="https://img.shields.io/badge/README-日本語-ff69b4?style=for-the-badge" />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/KirisameMarisa/video-review/stargazers">
      <img src="https://img.shields.io/github/stars/KirisameMarisa/video-review?style=social" alt="GitHub stars" />
    </a>
    &nbsp;&nbsp;
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
  </p>
</div>

<hr/>

<!-- One-liner + bullets -->
<h3>What it is</h3>

<p>
  VideoReview helps teams go beyond just “watching” review videos.
  Upload videos, leave timeline comments, draw directly on frames,
  and connect feedback to action.
</p>

<p>
  It currently integrates with <b>Slack</b> and <b>Jira</b>,
  and is designed to be extended to fit into existing production workflows.
</p>

<ul>
  <li><b>Workflow integrations</b> — Slack, Jira (more to come)</li>
  <li><b>Extensible by design</b> — built to fit into existing pipelines</li>
  <li><b>Engine / tool agnostic</b> — not tied to a single platform</li>
</ul>

<!-- Screenshot -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/532f55eb-0f47-45aa-b17c-2e7a8bb5e191" alt="VideoReview screenshot" width="1280" />
</p>

## Need help setting it up?

We can help with on-premise setups and integrations with existing tools.  
If you'd like support, feel free to reach out:

videoreview.contact.info@gmail.com

## 🤝 Contributing

We want more people to use VideoReview, and we'd love to build it together as OSS.  
Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get involved.

## ✨ Key Features

### 💻 Flexible Deployment: On‑premise or Cloud
**Review confidential videos without sending them outside your network.**

VideoReview is designed with on-premise operation in mind, allowing teams to review confidential footage securely inside their internal network.

Depending on your needs, you can also choose:
- AWS S3
- NextCloud

---

### 💬 Actionable Comment Panel
**Turn video comments into clear, actionable feedback.**

The comment list is designed with a social‑style, intuitive UI:

- Comments with drawings
- Comments linked to tickets
- Highlighted important comments

Badges and color cues highlight what needs action at a glance.

### 🔔 Never Miss Feedback with Slack & Jira
**Make feedback visible where your team already works.**

Reviews should not end at "watching."

By integrating with Slack and Jira, VideoReview naturally connects feedback to your existing workflow,
making important comments and ticketed feedback visible to the whole team.

Beyond messaging and issue tracking, VideoReview also supports a custom protocol to connect directly to external tools and apps:
- Launch an engine or editor from the relevant video scene
- Hook into your own production pipeline

Video review becomes a starting point for the next action.

### 🔗 Workflow Integrations
The following examples show how feedback flows beyond video review:

| Slack and JIRA Integration | Unity Auto-Open via Custom Protocol |
| ---- | ---- |
| <img src="https://github.com/user-attachments/assets/e075f4fb-33cd-4b6c-9977-a9d24872f797" width="340"></video> | <img src="https://github.com/user-attachments/assets/e49670b2-5cfb-4f50-9863-f3bbe7e074fa" width="640"></video> |


# ✨ Advanced Features
### 🔍 Powerful Search for Review Workflow

Search videos and comments independently:

- Find videos that have comments
- Filter by specific people or time ranges
- Narrow down to drawings or ticketed feedback

From day-to-day reviews to later retrospectives, the right info is always close.

<img src="https://github.com/user-attachments/assets/2ff99052-bf6f-409a-aab9-e6628444e61a" width="420"></img>

### 🔧 Built for Production Pipelines

Designed to fit into real production workflows.

- A maintenance CLI for admins (user management and data operations)  
  See: [maintenance README](./maintenance/README.md)
- Upload videos via API from DCC tools, automated tests, or CI

For example, videos can be uploaded from scripts or pipelines with a single command:

```bash
go run . upload-video \
  --title "title" \
  --folder_key "folder_key" \
  --scene_path "scene_path" \
  --video_path "/path/to/video.mp4"
```

## 🧭 Roadmap

VideoReview aims to stay useful in real production environments and will evolve step by step.

Our guiding ideas are:

- On‑premise‑first design and operations
- Integrations that fit naturally into existing workflows
- Review as a path to the next action
- Pipeline integration and automation

---

## 🚀 Getting Started

## 🐳 Docker (Production)
Recommended for production and long-term operation.

### Prerequisites
* Docker and Docker Compose

```bash
cp .example.env .env
cp compose.prod.example.yml compose.prod.yml
```

## Storage location

Edit [compose.prod.yml](./compose.prod.yml) and set the host path for storage.

```yaml
volumes:
  - /mnt/data/videoreview:/storage
```

### Build & Run
```bash
# 1. Create image
docker build -t videoreview:latest -f docker/web/Dockerfile.prod .

# 2. Run only DB
docker compose -f compose.prod.yml up -d db

# 3. Run prisma deploy (just once, for initial setup or schema changes)
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 4. Run web service
docker compose -f compose.prod.yml up -d videoreview

```

## 💻 Local / On‑premise Setup
Use this method when running VideoReview directly on a server or local machine.

### Prerequisites
* node v24
* postgreSQL

### Environment Configuration

```bash
cp .example.env .env
```

Edit .env and set the required values

```bash
LOCAL_ROOTDIR="/path/.../..."
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

### Build & Run

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:deploy
npm run prisma:generate

# Start the application
npm run build
npm run start
```

### Notes

In production environments, it is strongly recommended to set LOCAL_ROOTDIR explicitly.

If LOCAL_ROOTDIR is not set or invalid, the application falls back to ./uploads, which may not be suitable for long-term storage.

--- 

## 🐳 Docker (Development)

```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```

### Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/api/docs

---

## 📄 License

This project is licensed under the **MIT License**.
