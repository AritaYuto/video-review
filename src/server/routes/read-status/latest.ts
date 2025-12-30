import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const latestRouter = new Hono();

latestRouter.openapi({
    method: "get",
    summary: "Get latest comment",
    description: "Returns the latest comment of a video by its ID.",
    path: "/",
    parameters: [
        {
            name: "videoId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID of the video to retrieve the latest comment for",
        },
    ],
    responses: {
        200: {
            description: "Get latest comment",
        },
        400: {
            description: "Missing videoId",
        },
    },
}, async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const videoId = searchParams.get("videoId");

        // 400
        if (!videoId) {
            return c.json({ error: "missing videoId" }, 400);
        }

        const latest = await prisma.$queryRaw<
            { latestCommentId: string | null }[]
        >`
            SELECT c.id AS "latestCommentId"
            FROM "VideoComment" c
            WHERE c."videoId" = ${videoId}
            ORDER BY c."createdAt" DESC
            LIMIT 1
        `;

        const latestCommentId =
            latest.length > 0 ? latest[0].latestCommentId : null;

        return c.json(
            { latestCommentId },
            { status: 200 }
        );
    } catch {
        return c.json({ error: "failed to fetch latest comment" }, 500);
    }
});