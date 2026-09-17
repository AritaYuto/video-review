import "dotenv/config";
import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createClient } from "./client.js";

const baseUrl = process.env.VIDEO_REVIEW_SERVER_URL ?? "http://localhost:3489";
const apiToken = process.env.VIDEO_REVIEW_API_TOKEN ?? "";

if (!apiToken) {
    process.stderr.write(
        "Warning: VIDEO_REVIEW_API_TOKEN is not set. Requests will likely fail.\n",
    );
}

const client = createClient({ baseUrl, apiToken });

function createServer(): McpServer {
    const server = new McpServer({ name: "video-review", version: "1.0.0" });

    server.registerTool(
        "list_videos",
        {
            description: [
                "List videos in Video Review. Filters: title/folder text, tags (of the latest revision), upload date range,",
                "and comment-based filters (has comments, by user, with drawings, linked to an issue, comment date range).",
                "Use sortBy='uploadedAt_desc' with a limit to get the most recently uploaded videos.",
                "Each video includes its id, title, folderKey and latestRevision (revision number, uploadedAt, tags).",
            ].join(" "),
            inputSchema: {
                name: z.string().optional().describe("Filter by text contained in the video title or folder key"),
                tags: z.string().optional().describe("Filter by tags (comma-separated, e.g. 'bug,cutscene'); a video matches if it has any of them"),
                videoFrom: z.string().optional().describe("Only videos whose latest revision was uploaded on or after this date (ISO 8601). Always pair with videoTo"),
                videoTo: z.string().optional().describe("Only videos whose latest revision was uploaded on or before this date (ISO 8601). Always pair with videoFrom"),
                includeRevisions: z.boolean().optional().describe("Include all revisions in each video"),
                hasComments: z.boolean().optional().describe("Only videos that have at least one review comment (the comment filters below apply to that comment)"),
                commentUser: z.string().optional().describe("Only videos with a comment by this user display name (exact match). Implies hasComments"),
                hasDrawing: z.boolean().optional().describe("Only videos with a comment that has a drawing annotation. Implies hasComments"),
                hasIssue: z.boolean().optional().describe("Only videos with a comment linked to an issue tracker ticket. Implies hasComments"),
                commentsFrom: z.string().optional().describe("Only videos with a comment created on or after this date (ISO 8601). Implies hasComments; pair with commentsTo"),
                commentsTo: z.string().optional().describe("Only videos with a comment created on or before this date (ISO 8601). Implies hasComments; pair with commentsFrom"),
                sortBy: z.enum(["uploadedAt_desc", "uploadedAt_asc", "title_asc"]).optional().describe("Sort order. Use 'uploadedAt_desc' to get most recently uploaded videos first"),
                limit: z.number().optional().describe("Maximum number of videos to return"),
            },
        },
        async ({ name, tags, videoFrom, videoTo, includeRevisions, hasComments, commentUser, hasDrawing, hasIssue, commentsFrom, commentsTo, sortBy, limit }) => {
            // The comment filters on /videos only take effect together with hasComment.
            const wantsComments = hasComments || commentUser !== undefined || hasDrawing || hasIssue || commentsFrom !== undefined || commentsTo !== undefined;
            const data = await client.get("/videos", {
                filterTree: name,
                tags, videoFrom, videoTo, commentsFrom, commentsTo,
                user: commentUser,
                includeRevisions: includeRevisions ? "true" : undefined,
                hasComment: wantsComments ? "true" : undefined,
                hasDrawing: hasDrawing ? "true" : undefined,
                hasIssue: hasIssue ? "true" : undefined,
                sortBy,
                limit: limit != null ? String(limit) : undefined,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    server.registerTool(
        "get_video",
        {
            description: "Get details of a single video including all revisions (newest first, each with its id, revision number, uploadedAt, tags and summary).",
            inputSchema: { id: z.string().describe("Video UUID") },
        },
        async ({ id }) => {
            const data = await client.get(`/videos/${id}`);
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    server.registerTool(
        "list_comments",
        {
            description: "List review comments across all videos. videoId is optional — omit it to retrieve comments from all videos. Can be filtered by text content, date range, user, or whether they have drawings/issue links.",
            inputSchema: {
                videoId: z.string().optional().describe("Filter by video UUID"),
                filterText: z.string().optional().describe("Filter comments by text content"),
                from: z.string().optional().describe("Filter comments created after this date (ISO 8601)"),
                to: z.string().optional().describe("Filter comments created before this date (ISO 8601)"),
                hasDrawing: z.boolean().optional().describe("Only return comments that have a drawing annotation"),
                hasIssue: z.boolean().optional().describe("Only return comments linked to a Jira issue"),
                selectRevision: z.number().optional().describe("Filter by video revision number"),
                user: z.string().optional().describe("Filter comments by user name or email"),
            },
        },
        async ({ videoId, filterText, from, to, hasDrawing, hasIssue, selectRevision, user }) => {
            const data = await client.get("/comments", {
                videoId, filterText, from, to,
                hasDrawing: hasDrawing ? "true" : undefined,
                hasIssue: hasIssue ? "true" : undefined,
                selectRevision: selectRevision != null ? String(selectRevision) : undefined,
                user,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    server.registerTool(
        "list_video_events",
        {
            description: "List analysis events for a video (e.g. on-screen text, speech transcription, shot types, detected objects). Events are keyed by kind and time range.",
            inputSchema: {
                videoId: z.string().describe("Video UUID"),
                kind: z.string().optional().describe("Filter by event kind label (e.g. 'detected_text', 'transcription', 'shot_type', 'object_detection')"),
                filterText: z.string().optional().describe("Filter events by their data content"),
                selectRevision: z.number().optional().describe("Revision number to query events for (defaults to latest)"),
            },
        },
        async ({ videoId, kind, filterText, selectRevision }) => {
            const data = await client.get(`/videos/${videoId}/events`, {
                kind, filterText,
                selectRevision: selectRevision != null ? String(selectRevision) : undefined,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    server.registerTool(
        "search_videos_by_event",
        {
            description: "Search for videos by their event content (e.g. subtitles, detected objects, speech transcripts). Use this when the user asks questions like 'which video has a conversation about X' or 'find videos where Y appears'. Returns matching videos with up to 5 matching event snippets each.",
            inputSchema: {
                filterText: z.string().describe("Text to search for within event data (e.g. subtitle content, detected object label)"),
                kind: z.string().optional().describe("Filter by event kind label (e.g. 'transcription', 'detected_text', 'object_detection')"),
                limit: z.number().optional().describe("Maximum number of videos to return"),
            },
        },
        async ({ filterText, kind, limit }) => {
            const data = await client.get("/videos/search-by-event", {
                filterText,
                kind,
                limit: limit != null ? String(limit) : undefined,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    server.registerTool(
        "list_vcs_changes",
        {
            description: [
                "List the code changes (pull requests and commits) linked to a video revision: what changed in the",
                "repository between the previous revision and this one, with a relevance score against the video's watched paths.",
                "Use this for questions like 'which code changes are behind this video' or 'did the camera code change before this revision'.",
                "Defaults to the latest revision compared with the one before it.",
            ].join(" "),
            inputSchema: {
                videoId: z.string().describe("Video UUID"),
                toRevision: z.number().optional().describe("Revision number to inspect (defaults to the latest)"),
                fromRevision: z.number().optional().describe("Older revision number to compare from (defaults to the one before toRevision)"),
            },
        },
        async ({ videoId, toRevision, fromRevision }) => {
            const video = await client.get<{ revisions: { id: string; revision: number; deleted: boolean }[] }>(`/videos/${videoId}`);
            const revisions = video.revisions.filter(r => !r.deleted).sort((a, b) => a.revision - b.revision);
            const to = toRevision != null ? revisions.find(r => r.revision === toRevision) : revisions[revisions.length - 1];
            const toIndex = to ? revisions.indexOf(to) : -1;
            const from = fromRevision != null ? revisions.find(r => r.revision === fromRevision) : revisions[toIndex - 1];
            if (!to) {
                const text = JSON.stringify({ error: "Revision not found", revisions: revisions.map(r => r.revision) });
                return { content: [{ type: "text" as const, text }], isError: true };
            }
            // Without an older revision the server can only answer from its cache.
            const data = await client.get(`/videos/${videoId}/vcs-changes`, { from: from?.id, to: to.id });
            return { content: [{ type: "text" as const, text: JSON.stringify({ fromRevision: from?.revision ?? null, toRevision: to.revision, ...data as object }, null, 2) }] };
        },
    );

    server.registerTool(
        "get_vcs_summary",
        {
            description: "Get the AI-written summary of the code changes linked to a video revision (defaults to the latest). Requires list_vcs_changes to have been fetched for that revision at least once.",
            inputSchema: {
                videoId: z.string().describe("Video UUID"),
                toRevision: z.number().optional().describe("Revision number (defaults to the latest)"),
            },
        },
        async ({ videoId, toRevision }) => {
            const video = await client.get<{ revisions: { id: string; revision: number; deleted: boolean }[] }>(`/videos/${videoId}`);
            const revisions = video.revisions.filter(r => !r.deleted).sort((a, b) => a.revision - b.revision);
            const to = toRevision != null ? revisions.find(r => r.revision === toRevision) : revisions[revisions.length - 1];
            if (!to) {
                return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Revision not found" }) }], isError: true };
            }
            const data = await client.get(`/videos/${videoId}/vcs-summary`, { to: to.id });
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    server.registerTool(
        "list_tags",
        { description: "List all tags that exist across all videos in Video Review." },
        async () => {
            const data = await client.get("/videos/tags");
            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        },
    );

    return server;
}

if (process.env.MCP_TRANSPORT === "http") {
    await startHttpServer();
} else {
    await createServer().connect(new StdioServerTransport());
}

async function startHttpServer(): Promise<void> {
    const port = parseInt(process.env.MCP_PORT ?? "3490", 10);

    const httpServer = http.createServer(async (req, res) => {
        if (req.url === "/mcp") {
            // Stateless mode: a fresh server per request, released once the response closes.
            const server = createServer();
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            res.on("close", () => {
                void transport.close();
                void server.close();
            });
            await server.connect(transport);
            await transport.handleRequest(req, res);
        } else {
            res.writeHead(404).end();
        }
    });

    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
    process.stderr.write(`MCP server listening on http://0.0.0.0:${port}/mcp\n`);
}
