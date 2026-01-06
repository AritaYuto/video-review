import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import * as z from "@/schema/zod"

export const getVideoRouter = new Hono();

getVideoRouter.openapi({
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
                    schema: z.VideoSchema,
                },
            },
        },
        404: {
            description: "Video not found",
        },
    },
}, async (c) => {
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