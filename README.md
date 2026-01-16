# VideoReview

> 🚀 **Live Demo**  
> Try it here:  
> https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/

📘 Read this in Japanese → [README.jp.md](./README.jp.md)

VideoReview is a web service that helps teams go beyond just "watching" review videos.  
Upload videos, leave comments or draw directly on frames, and share feedback in a lightweight, social-style flow.  
It integrates with existing workflows such as Slack and Jira, allowing feedback to naturally lead to next actions.

This project is designed for team reviews in production environments such as video production and game development.

<img src="./documents/resources/welcome.png" controls="true" width="1280"></video>

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
| <img src="./documents/resources/comment.gif" width="340"></video> | <img src="./documents/resources/custom-protocol.gif" width="640"></video> |


# ✨ Advanced Features
### 🔍 Powerful Search for Review Workflow

Search videos and comments independently:

- Find videos that have comments
- Filter by specific people or time ranges
- Narrow down to drawings or ticketed feedback

From day-to-day reviews to later retrospectives, the right info is always close.

<img src="./documents/resources/movie_search.gif" width="420"></video>

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

Specific features and priorities will adjust based on real usage and feedback.

---

## 🚀 Getting Started

## 🐳 Docker (Production)
Recommended for production and long-term operation.

### Prerequisites
* Docker and Docker Compose

### Environment Configuration

```bash
cp .example.env .env
```

Edit .env and set the required values

```bash
VIDEO_REVIEW_API_TOKEN=your-strong-random-secret
JWT_SECRET=your-random-api-token
```

## Storage location (Production) 

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
JWT_SECRET="xxxxxxx"
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
