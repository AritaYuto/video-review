# VideoReview 

> 🚀 **Live Demo**  
> Try VideoReview in your browser:  
> https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/

📘 日本語版 README はこちら → [README.jp.md](./README.jp.md)

VideoReview is a lightweight review tool where team members can upload videos,
add timeline comments, draw directly on frames, and communicate like using your everyday social media.  
It is designed to support feedback workflows in game development, video production, and other collaborative environments.  

<img src="./documents/resources/drawing.gif" controls="true" width="800"></video>

## ✨ Key Features

### From Discovery to Feedback: A Seamless Workflow

* **Fast Search:**   
Quickly find videos using keywords, even in large libraries.
* **Tree-Based Organization:**  
Manage videos using a hierarchical tree structure. This ensures you always have the full context of where a video belongs (e.g., Chapter 1 > Boss Battle).
* **Activity Indicators:**  
New comments are marked with a "New" icon, so you never miss an update or a request for review.

<img src="./documents/resources/search_movie.gif" controls="true" width="300"></video>

### Integrated Communication & Task Management

* **Slack Integration:**  
Push comments, timestamps, and screenshots directly to Slack. Team members can see the feedback and jump to the exact video frame with a single click.

<img src="./documents/resources/slack.gif" controls="true" width="300"></video>


* **Jira Ticket Creation:**  
Convert feedback into action. Create Atlassian Jira tickets directly from comments to bridge the gap between "Review" and "Development."

<img src="./documents/resources/create_issue.gif" controls="true" width="300"></video>

* **Visual Annotations:**  
Draw directly on the video player. Use arrows and sketches to explain nuances like motion, positioning, or VFX timing that words can't describe.

<img src="./documents/resources/drawing.gif" controls="true" width="800"></video>

### Flexible Deployment & Automation

* **REST API for Automation:**   
Integrate VideoReview into your CI/CD pipeline or build scripts. Automatically upload the latest build recordings for daily reviews.
* **Security-First Storage:**  
Run VideoReview entirely on-premises to keep confidential game assets within your internal network, or use AWS S3 for scalable cloud storage.


## 🚀 Development Setup
This project supports **two development setups**:
- **Docker**
- **Local / On‑premise (without Docker)**

## 🐳 Option A: Docker

If you have Docker and Docker Compose installed, you can start everything with:

```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```

## 💻 Option B: Local / On‑premise Setup (without Docker)

Use this option if you want to run everything directly on your local machine.

#### Required tools.
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
  http://localhost:3489/docs


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
