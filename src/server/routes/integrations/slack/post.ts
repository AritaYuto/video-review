import { authorize, JwtError } from "@/server/lib/token";
import { WebClient } from "@slack/web-api";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";
import * as env from "@/lib/env";

export const postRouter = new Hono();

postRouter.openapi({
    method: "post",
    summary: "Post to Slack",
    description: "Posts a message with an image to a Slack channel.",
    path: "/",
    responses: {
        200: {
            description: "Message posted successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, 401);
    }

    const token = env.SLACK_API_TOKEN();
    const channel = env.SLACK_POST_CH();
    if (!token || !channel) {
        return c.json({ error: "slack configuration is missing" }, 500);
    }

    const client = new WebClient(token);

    const formData = await c.req.formData();
    const comment = formData.get("comment") as string;
    const file = formData.get("file") as File | null;

    if (!file) {
        return c.json({ error: "not found screenshot" }, 400);
    }

    const name = file.name;
    const size = file.size;

    const preparResponce = await client.files.getUploadURLExternal({ filename: name, length: size });
    if (!preparResponce.ok) {
        return c.json({ error: "failed to prepare slack upload" }, 502);
    }

    const uploadUrl = preparResponce.upload_url!;
    const fileId = preparResponce.file_id!;

    const form = new FormData();
    form.append('filename', name);
    form.append('file', file, name);

    const uploadResponce = await fetch(uploadUrl, {
        method: "POST",
        body: form
    });

    if (!uploadResponce.ok) {
        return c.json({ error: "failed to upload file to slack" }, 502);
    }

    const chatRes = await client.chat.postMessage({
        channel,
        text: comment
    });

    if (!chatRes.ok || !chatRes.ts || !chatRes.channel) {
        return c.json({ error: "failed to post slack message" }, 502);
    }

    const filesRes = await client.files.completeUploadExternal({
        channel_id: channel,
        files: [{ id: fileId, title: name }]
    });

    if (!filesRes.ok) {
        await client.chat.postMessage({
            channel,
            thread_ts: chatRes.ts,
            text: "⚠️ file upload failed",
        });
        return c.json({ error: "failed to upload file" }, 502);
    }

    return c.json({ ok: true, ts: chatRes.ts.replace('.', ''), channelId: chatRes.channel });
});