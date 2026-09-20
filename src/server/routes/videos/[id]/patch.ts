import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";

const BodySchema = z.object({
    vcsWatchPaths: z.array(z.string()).optional(),
    guestVisible: z.boolean().optional(),
});

export const patchVideoRouter = createRouter()
    .openapi(createRoute({
        method: "patch",
        summary: "Update video metadata",
        description: "Updates mutable metadata on a video. Intended for CI/CD use (e.g. setting vcsWatchPaths after upload).",
        path: "/",
        request: {
            body: {
                required: true,
                content: {
                    "application/json": {
                        schema: BodySchema,
                    },
                },
            },
        },
        responses: {
            200: { description: "Video updated" },
            400: { description: "Bad request" },
            401: { description: "Unauthorized" },
            404: { description: "Video not found" },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const videoId = c.req.param("id");
        const body = c.req.valid("json");

        if (Object.keys(body).length === 0) {
            return c.json({ error: "no fields to update" }, { status: 400 });
        }

        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video) {
            return c.json({ error: "Video not found" }, { status: 404 });
        }

        const updated = await prisma.video.update({
            where: { id: videoId },
            data: {
                ...(body.vcsWatchPaths !== undefined && { vcsWatchPaths: body.vcsWatchPaths }),
                ...(body.guestVisible !== undefined && { guestVisible: body.guestVisible }),
            },
        });

        return c.json(updated);
    });
