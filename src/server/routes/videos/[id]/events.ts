import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { VideoEventSchema, VideoEventKindSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";

const QuerySchema = z.object({
    selectRevision: z.string().transform(v => parseInt(v)).optional(),
    filterText: z.string().optional(),
    kind: z.string().optional(),
    hasLink: z.string().transform(v => v === "true").optional(),
});

export const eventsRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get video events",
        description: "Retrieves events for a specific video revision.",
        path: "/",
        request: { query: QuerySchema },
        responses: {
            200: {
                description: "Events retrieved successfully",
                content: {
                    "application/json": {
                        schema: VideoEventSchema.extend({ kind: VideoEventKindSchema.pick({ label: true }) }).array(),
                    },
                },
            },
            500: errorResponse("Failed to fetch events"),
        },
    }), async (c) => {
        try {
            const videoId = c.req.param("id");
            const { selectRevision, filterText, kind, hasLink } = c.req.valid("query");

            const events = await prisma.videoEvent.findMany({
                where: {
                    videoRevision: {
                        videoId,
                        ...(selectRevision ? { revision: selectRevision } : {}),
                    },
                    ...(filterText ? { data: { contains: filterText } } : {}),
                    ...(kind ? { kind: { label: kind } } : {}),
                },
                include: {
                    kind: {
                        select: {
                            label: true,
                        },
                    },
                },
                orderBy: [
                    { startMs: "asc" },
                    { seq: "asc" },
                ],
            });

            return c.json(events, 200);
        } catch {
            return c.json({ error: "failed to fetch events" }, 500);
        }
    });
