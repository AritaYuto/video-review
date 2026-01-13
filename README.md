# VideoReview

> 🚀 **Live Demo**  
> Try it here:  
> https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/

📘 Read this in Japanese → [README.jp.md](./README.jp.md)

VideoReview is a web service that helps teams go beyond just "watching" review videos.  
Upload videos, leave comments or draw directly on frames, and share feedback in a lightweight, social-style flow.  
It integrates with existing workflows such as Slack and Jira, allowing feedback to naturally lead to next actions.

This project is designed for team reviews in production environments such as video production and game development.

## Need help setting it up?

We can help with on-premise setups and integrations with existing tools.  
If you'd like support, feel free to reach out:

videoreview.contact.info@gmail.com

## 🤝 Contributing

We want more people to use VideoReview, and we'd love to build it together as OSS.  
Please see `CONTRIBUTING.md` for how to get involved.

## ✨ Key Features

### 🔔 Never Miss Feedback with Slack & Jira

Reviews should not end at "watching."

By integrating with Slack and Jira, VideoReview naturally connects feedback to your existing workflow.  
Important comments and ticketed feedback become visible to the whole team and are easy to catch.

It also supports a custom protocol to connect directly to external tools and apps, for example:

- Launch an engine or editor from the relevant video scene
- Hook into your own production pipeline

Video review becomes a starting point for the next action.

### 💻 Flexible Deployment: On‑premise or Cloud

VideoReview is designed with on‑premise operation in mind.  
Keeping videos inside your internal network lets you review confidential footage without sending it outside.

Depending on your needs, you can also choose:
- AWS S3
- NextCloud

You can balance security, cost, and operational overhead by using on‑premise or cloud storage as needed.

### 🔍 Powerful Search for Review Workflow

Search videos and comments independently:

- Find videos that have comments
- Filter by specific people or time ranges
- Narrow down to drawings or ticketed feedback

From day‑to‑day reviews to later retrospectives, the right info is always close.

### 💬 Actionable Comment Panel

The comment list is designed with a social‑style, intuitive UI:

- Comments with drawings
- Comments linked to tickets
- Important feedback

Badges and color cues highlight what needs action at a glance.

### 🔧 Built for Production Pipelines

Designed to fit into real production workflows.

- A maintenance CLI for admins (user management and data operations)  
  See: [maintenance README](./maintenance/README.jp.md)
- Upload videos via API from DCC tools, automated tests, or CI

## 🧭 Roadmap

VideoReview aims to stay useful in real production environments and will evolve step by step.

Our guiding ideas are:

- On‑premise‑first design and operations
- Integrations that fit naturally into existing workflows
- Review as a path to the next action
- Pipeline integration and automation

Specific features and priorities will adjust based on real usage and feedback.

---

## 🚀 Development Setup

We support two setup options: Docker and local.

## 🐳 Docker

Prerequisites: Docker and Docker Compose

```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```

## 💻 Local / On‑premise Setup

#### Required tools

* node v24
* postgreSQL

```bash
# Install dependencies
npm install

cp .example.env .env

# Required .env Values
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
JWT_SECRET="xxxxxxx"

# Generate Prisma Client
npm run prisma:deploy
npm run prisma:generate

# Start the development server
npm run dev
```

### Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/api/docs

---

## 🛠 Build & Deploy

```
# Install dependencies
npm install

cp .example.env .env

# Run build
npm run build

# Start server
npm run start
```

## 📄 License

This project is licensed under the **MIT License**.
