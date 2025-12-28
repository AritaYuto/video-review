import { apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { Hono } from "hono";
import { NextResponse } from "next/server";

export const updateStatusRouter = new Hono();

updateStatusRouter.post('/', async (c) => {
    try {
        const { userId, videoId, lastReadCommentId } = await c.req.json();

        if (!userId || !videoId || !lastReadCommentId) {
            return apiError("invalid request body", 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ ok: true });
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

        return NextResponse.json({ ok: true });
    } catch {
        return apiError("failed to update read status", 500);
    }
});