import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const lastUpdatedRouter = new Hono();

lastUpdatedRouter.openapi({
    method: "get",
    summary: "Get last updated time",
    description: "Retrieves the last updated time for comments in a video.",
    path: "/",
    responses: {
        200: {
            description: "Last updated time retrieved successfully",
        },
        400: {
            description: "Invalid parameters",
        },
    },
}, async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const videoId = searchParams.get("videoId");
        const email = searchParams.get("email");

        // 400
        if (!videoId) {
            return c.json({ error: "missing videoId" }, 400);
        }
        if (!email) {
            return c.json({ error: "missing email" }, 400);
        }

        const latest = await prisma.videoComment.aggregate({
            _max: { updatedAt: true },
            where: {
                videoId,
                userEmail: { not: email },
            },
        });

        return c.json(
            { updatedAt: latest._max.updatedAt },
            { status: 200 }
        );

    } catch {
        return c.json({ error: "failed to fetch last updated time" }, 500);        
    }
});