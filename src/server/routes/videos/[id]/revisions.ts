import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, roleOf } from "@/server/lib/token";
import { assertRoleCanSeeVideo } from "@/server/lib/videos/guest-access";
import * as z from "@/schema/zod"

export const revisionsRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get revisions",
        description: "Returns all revisions of a video by its ID.",
        path: "/",
        parameters: [
            {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID of the video to retrieve revisions for",
            },
        ],
        responses: {
            200: {
                description: "Get revisions",
                content: {
                    "application/json": {
                        schema: z.VideoRevisionSchema.array(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            404: {
                description: "Video not found",
            },
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        const id = c.req.param("id") as string;
        await assertRoleCanSeeVideo(id, roleOf(auth));

        try {
            const revisions = await prisma.videoRevision.findMany({
                where: { videoId: id, deleted: false },
                orderBy: { revision: "desc" },
            });

            return c.json(revisions);
        } catch (err) {
            return c.json({ error: "Failed to fetch revisions" }, { status: 500 });
        }
    });
