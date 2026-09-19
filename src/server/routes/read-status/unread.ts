import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";

export const unreadRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get unread videos",
        description: "Returns the list of unread video IDs for a user.",
        path: "/",
        request: { query: z.object({ userId: z.string().min(1) }) },
        responses: {
            200: {
                description: "Get unread videos",
                content: {
                    "application/json": {
                        schema: z.object({ unreadVideoIds: z.string().array() }),
                    },
                },
            },
            400: errorResponse("Missing userId"),
            500: errorResponse("Failed to fetch unread video ids"),
        },
    }), async (c) => {
        try {
            const { userId } = c.req.valid("query");

            const unreadVideoIds = await prisma.$queryRaw<{ videoId: string }[]>`
            WITH latest AS (
                SELECT v.id AS "videoId",
                       c.id AS "latestCommentId"
                FROM "Video" v
                LEFT JOIN LATERAL (
                    SELECT id
                    FROM "VideoComment"
                    WHERE "videoId" = v.id
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                ) c ON true
            )
            SELECT l."videoId"
            FROM latest l
            LEFT JOIN "UserVideoReadStatus" s
                   ON s."videoId" = l."videoId"
                  AND s."userId" = ${userId}
            WHERE 
                l."latestCommentId" IS NOT NULL
                AND (
                    s."lastReadCommentId" IS NULL
                    OR s."lastReadCommentId" != l."latestCommentId"
                );
        `;

            return c.json({
                unreadVideoIds: unreadVideoIds.map((x) => x.videoId),
            }, 200);

        } catch {
            return c.json({ error: "failed to fetch unread video ids" }, 500);
        }
    });
