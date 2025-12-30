import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const updateStatusRouter = new Hono();

updateStatusRouter.openapi({
    method: "post",
    summary: "Update read status",
    description: "Updates the read status of a video for a user.",
    path: "/",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            description: "ID of the user",
                        },
                        videoId: {
                            type: "string",
                            description: "ID of the video",
                        },
                        lastReadCommentId: {
                            type: "string",
                            description: "ID of the last read comment",
                        },
                    },
                    required: ["userId", "videoId", "lastReadCommentId"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Update read status",
        },
        400: {
            description: "Invalid request body",
        },
    },
}, async (c) => {
    try {
        const { userId, videoId, lastReadCommentId } = await c.req.json();

        if (!userId || !videoId || !lastReadCommentId) {
            return c.json({ error: "invalid request body" }, 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return c.json({ ok: true });
        }

        await prisma.userVideoReadStatus.upsert({
            where: {
                userId_videoId: { userId, videoId },
            },
            update: {
                lastReadCommentId,
            },
            create: {
                userId,
                videoId,
                lastReadCommentId,
            },
        });

        return c.json({ ok: true });
    } catch {
        return c.json({ error: "failed to update read status" }, 500);
    }
});