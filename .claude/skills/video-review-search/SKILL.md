---
name: video-review-search
description: Find videos, review comments and the code changes behind them in VideoReview through the video-review MCP server. Use when asked which videos exist, changed, were commented on, or match a tag, dialogue line or timeframe.
---

# Searching VideoReview

Use the `video-review` MCP server for every question about videos, review comments, tags,
on-screen text or dialogue, and the pull requests behind a revision. Do not answer from memory
or from files in this repository.

## Workflow

1. Read the server's search guide once per session: the `search-videos` prompt or the
   `video-review://search-guide` resource. It says which tool answers which question and
   the rules for dates, tags and code changes.
2. When a tag or folder is mentioned, confirm it exists with `list_tags` / `list_folders`
   before filtering.
3. Call the tool, then answer with video titles as links
   (`[title](/video-review/review/VIDEO_ID)`), quoted comment text, and one line per match on
   why it matched.

## Team vocabulary

Team-specific meaning of tags, folders and labels lives in the file pointed to by
`VIDEO_REVIEW_MCP_GUIDE_PATH` and is served by the MCP server, not in this skill. Keep this
file generic so it can be shared between projects.
