# MCP Server Guide

The MCP (Model Context Protocol) server exposes VideoReview data to AI assistants as a set of
tools: list videos, read comments, search on-screen text and dialogue, and follow the code changes
linked to each revision. The same server backs two entry points:

- **Claude Code / Claude Desktop / Gemini CLI** connect to it directly and can answer questions
  like "which videos changed last week?" from your terminal.
- **The in-app chat search** (the chat icon in the video list header) calls it from the VideoReview
  server, so search behaviour is defined in one place.

The server itself is a thin layer over the VideoReview REST API. It holds an API token and calls
`/api/v1/...` on your behalf; it never talks to a database or an LLM.

---

## 1. Prerequisites

- A running VideoReview instance (local `npm run dev`, or Docker).
- An API token. Issue one from the admin screen, see the [Admin Guide](./admin-guide.md).
- For local (stdio) use: Node 24 and the repository checked out with `npm install` done.

Set these in `.env` at the repository root (the MCP server reads it on start):

```env
VIDEO_REVIEW_SERVER_URL=http://localhost:3489   # VideoReview base URL
VIDEO_REVIEW_API_TOKEN=<your API token>
```

---

## 2. Run modes

| Mode | Command | Use it for |
|---|---|---|
| stdio | `npm run mcp:dev` (or `npm run mcp:build && npm run mcp:run`) | Claude Code / Claude Desktop on the same machine. The client starts the process itself. |
| HTTP | `MCP_TRANSPORT=http MCP_PORT=3490 npm run mcp:run` or the `mcp` compose service | The in-app chat search, and clients on other machines. Endpoint: `http://<host>:3490/mcp` |

With Docker the `mcp` service is defined in `compose.yml` (development) and in
`compose.prod.mcp.claude.yml` / `compose.prod.mcp.ollama.yml` (production overlays):

```bash
docker compose -f compose.yml up -d --build mcp
# production
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .
docker compose -f compose.prod.yml -f compose.prod.mcp.claude.yml up -d mcp
```

The compose files also set `VIDEO_REVIEW_MCP_URL=http://mcp:3490/mcp` on the web service, which is
what enables the in-app chat search. Without that variable the chat icon stays disabled.

---

## 3. Connect Claude Code

The repository ships a project-scoped config, `.mcp.json`, that starts the server over stdio:

```json
{
    "mcpServers": {
        "video-review": {
            "command": "npx",
            "args": ["tsx", "integrations/mcp/index.ts"]
        }
    }
}
```

Open Claude Code in the repository directory and approve the server when prompted (project
servers need a one-time approval). Check with:

```bash
claude mcp list
# video-review: npx tsx integrations/mcp/index.ts - ✔ Connected
```

To register it yourself instead, from any directory:

```bash
# stdio, same machine (reads .env from the repository root)
claude mcp add video-review -s user -- npx tsx /path/to/video-review/integrations/mcp/index.ts

# HTTP, e.g. the Docker service or a server on another machine
claude mcp add --transport http video-review http://localhost:3490/mcp
```

Then ask in a Claude Code session, for example:

- "List the videos uploaded this week in VideoReview."
- "Which videos have comments with a drawing?"
- "What code changes are behind the latest revision of the dragon boss video?"

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "video-review": {
            "command": "npx",
            "args": ["tsx", "/path/to/video-review/integrations/mcp/index.ts"],
            "env": {
                "VIDEO_REVIEW_SERVER_URL": "http://localhost:3489",
                "VIDEO_REVIEW_API_TOKEN": "<your API token>"
            }
        }
    }
}
```

### Gemini CLI

```bash
gemini mcp add --transport http video-review http://localhost:3490/mcp
```

---

## 4. Tools

| Tool | What it answers |
|---|---|
| `list_videos` | Videos filtered by title/folder text, tags, upload date range, and comment conditions (has comments, by user, with drawing, linked to an issue, comment date range). Sort and limit for "most recent". |
| `get_video` | One video with all revisions (ids, numbers, upload dates, tags, summaries). |
| `list_comments` | Review comments across all videos or for one video, filtered by text, user, date, drawing, issue link, revision. |
| `list_video_events` | Analysis events of one video: on-screen text, transcription, shot types, detected objects. |
| `search_videos_by_event` | Videos whose events contain a text, e.g. a line of dialogue or a caption. |
| `list_vcs_changes` | Pull requests and commits linked to a revision, with relevance against the video's watched paths. |
| `get_vcs_summary` | The AI-written summary of those changes. |
| `list_tags` | Every tag in use. |
| `list_folders` | Every folder key in use. |

Dates are ISO 8601. Tag and comment-user filters match the latest revision's tags and the comment's
display name respectively.

### Search guide (shared knowledge)

`integrations/mcp/search-guide.md` tells an assistant which tool answers which question and the
rules for dates, tags and code changes. The server sends it to every client three ways, so the
in-app chat, Claude Code and any bot behave the same:

- as the server `instructions` (clients receive it on connect; the in-app chat uses it as the
  system prompt, together with the live tag and folder lists),
- as the `search-videos` prompt (Claude Code shows it as `/mcp__video-review__search-videos`),
- as the `video-review://search-guide` resource.

Team-specific vocabulary (what your tags and folders mean, who owns what) does not belong in the
repository. Put it in a Markdown file and point the server at it:

```env
VIDEO_REVIEW_MCP_GUIDE_PATH=/srv/videoreview/team-notes.md
```

It is appended to the bundled guide under a "Team notes" heading. Edit the guide or the notes,
restart the server, and every client picks up the change.

### Skill for Claude Code and other agents

`.claude/skills/video-review-search/SKILL.md` is a short, generic skill that tells an agent to use
this MCP server for video questions and how to work with it. It follows the Agent Skills format,
so tools other than Claude Code can read it too. Keep it generic; the vocabulary lives in the guide.

---

## 5. Check that search finds the right videos

`prisma/eval-data.ts` describes a small, deterministic set of videos (tags, revisions, comments,
on-screen text, linked pull requests) under the `eval/` folder. Seed it into the database your
VideoReview instance uses, then run the checks against the MCP server:

```bash
npm run prisma:seed:eval   # uses DATABASE_URL from .env; only the eval/ folder is replaced
npm run mcp:eval           # spawns the stdio server, expects 12/12 passed
MCP_EVAL_URL=http://localhost:3490/mcp npm run mcp:eval   # same, against the HTTP server
```

Each check is the tool call an assistant should make for a question ("which videos did Kita
comment on?") and the exact titles that must come back. Use it after changing tools or the
underlying API, and as a starting point for your own questions. Re-running the seed resets the
`eval/` folder and leaves everything else untouched.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Warning: VIDEO_REVIEW_API_TOKEN is not set` on start | `.env` is not in the working directory of the process, or the key is missing. For Claude Desktop pass it via `env` in the config. |
| Tools return `HTTP 401` | The token is wrong or was revoked. Issue a new one from the admin screen. |
| Tools return `HTTP 404` / connection refused | `VIDEO_REVIEW_SERVER_URL` points at the wrong host. Inside Docker use `http://web:3489`, not `localhost`. |
| Chat icon in the app is disabled | The web server has no `VIDEO_REVIEW_MCP_URL`, or cannot reach it. `GET /api/v1/llm/status` shows which. |
| `list_vcs_changes` says the revision needs a `from` | The first revision of a video has no earlier revision to compare with, and nothing is cached for it yet. Open the VCS panel for that video once, or ask about a later revision. |
