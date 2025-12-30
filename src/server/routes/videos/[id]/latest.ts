import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import * as z from "@/schema/zod"

export const latestRouter = new Hono();

latestRouter.openapi({
    method: "get",
    summary: "Get latest revision",
    description: "Returns the latest revision of a video by its ID.",
    path: "/",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID of the video to retrieve the latest revision for",
        },
    ],
    responses: {
        200: {
            description: "Get latest revision",
            content: {
                "application/json": {
                    schema: z.VideoRevisionSchema,
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
        const latest = await prisma.videoRevision.findFirst({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        if (!latest) {
            return c.json({ error: "No revisions found" }, { status: 404 });
        }

        return c.json(latest);
    } catch (err) {
        return c.json({ error: "Failed to fetch latest revision" }, { status: 500 });
    }
});