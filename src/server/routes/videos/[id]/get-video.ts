import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { VideoRevisionSchema } from "@/schema/zod";
import { VideoSchema } from "@/server/lib/openapi/models";

export const getVideoRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get video",
        description: "Returns a video by its ID.",
        path: "/",
        parameters: [
            {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID of the video to retrieve",
            },
        ],
        responses: {
            200: {
                description: "Get video",
                content: {
                    "application/json": {
                        schema: VideoSchema.extend({ revisions: VideoRevisionSchema.array() }),
                    },
                },
            },
            404: {
                description: "Video not found",
            },
        },
    }), async (c) => {
        const id = c.req.param("id");
        try {
            const video = await prisma.video.findUnique({
                where: { id },
                include: {
                    revisions: {
                        orderBy: { revision: "desc" },
                    },
                },
            });

            if (!video) {
                return c.json({ error: "Video not found" }, { status: 404 });
            }

            return c.json(video);
        } catch (err) {
            return c.json({ error: "Failed to fetch video" }, { status: 500 });
        }
    });
