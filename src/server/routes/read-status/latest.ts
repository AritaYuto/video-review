import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

export const latestRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get latest comment",
        description: "Returns the latest comment of a video by its ID.",
        path: "/",
        request: { query: z.object({ videoId: z.string().min(1) }) },
        responses: {
            200: {
                description: "Get latest comment",
                content: {
                    "application/json": {
                        schema: z.object({ latestCommentId: z.string().nullable() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            400: errorResponse("Missing videoId"),
            500: errorResponse("Failed to fetch latest comment"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        try {
            const { videoId } = c.req.valid("query");

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

            return c.json({ latestCommentId }, 200);
        } catch {
            return c.json({ error: "failed to fetch latest comment" }, 500);
        }
    });
