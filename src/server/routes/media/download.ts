import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { authorize, JwtError } from "@/server/lib/token";
import { VideoReviewStorage } from "@/server/lib/storage";
import { prisma } from "@/server/lib/db";

export const downloadRouter = new Hono();

downloadRouter.openapi({
    method: "get",
    summary: "Download media",
    description: "Returns the media file for download.",
    path: "/",
    responses: {
        200: {
            description: "Download media",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
        404: {
            description: "Video revision not found",
        },
    },
}, async (c) => {
    try {
        authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(c.req.url);
    const id = searchParams.get("videoRevId");
    const videoId = searchParams.get("videoId");

    if (!id || !videoId) {
        return c.json({ error: "Missing parameters" }, { status: 400 });
    }

    const videoRev = await prisma.videoRevision.findFirst({
        where: { id, videoId },
        include: {
            video: {
                select: { title: true },
            },
        },
    });

    if (!videoRev) {
        return c.json({ error: "Video revision not found" }, { status: 404 });
    }

    const storageKey = videoRev.filePath;
    const stream = await VideoReviewStorage.download(storageKey);
    return stream;
});
