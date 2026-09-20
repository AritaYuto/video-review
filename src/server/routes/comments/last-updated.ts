import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

export const lastUpdatedRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get last updated time",
        description: "Retrieves the last updated time for comments in a video.",
        path: "/",
        responses: {
            200: {
                description: "Last updated time retrieved successfully",
            },
            401: errorResponse("Unauthorized"),
            400: {
                description: "Invalid parameters",
            },
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

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
