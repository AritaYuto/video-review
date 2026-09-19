import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { getSession } from "@/server/lib/upload-session";
import { errorResponse } from "@/server/lib/openapi/error-response";

export const uploadStatusRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get upload status",
        description: "Returns the upload status of a video.",
        path: "/",
        request: { query: z.object({ session_id: z.string().min(1) }) },
        responses: {
            200: {
                description: "Upload in progress, uploaded, or completed",
                content: {
                    "application/json": {
                        schema: z.union([
                            z.object({
                                status: z.enum(["progress", "uploaded"]),
                                nextRev: z.number().int(),
                                title: z.string(),
                                folderKey: z.string(),
                            }),
                            z.object({
                                status: z.literal("completed"),
                                revisionId: z.string(),
                                videoId: z.string(),
                                revision: z.number().int(),
                            }),
                        ]),
                    },
                },
            },
            400: errorResponse("Missing session_id"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: {
                description: "Session not found",
                content: {
                    "application/json": {
                        schema: z.object({ status: z.literal("not_found") }),
                    },
                },
            },
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const { session_id } = c.req.valid("query");

        const session = await getSession(session_id);
        if (session) {
            const hasObject = await VideoReviewStorage.hasObject(session.storage);
            const status = hasObject ? ("progress" as const) : ("uploaded" as const);
            return c.json({
                status: status,
                nextRev: session.nextRev,
                title: session.title,
                folderKey: session.folderKey,
            }, 200);
        }

        const revision = await prisma.videoRevision.findFirst({
            where: { id: session_id },
        });

        if (revision) {
            return c.json({
                status: "completed" as const,
                revisionId: revision.id,
                videoId: revision.videoId,
                revision: revision.revision,
            }, 200);
        }

        return c.json({ status: "not_found" as const }, 404);
    });
