import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { authorize, JwtError } from "@/server/lib/token";
import { VideoReviewStorage } from "@/server/lib/storage";
import { getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const uploadStatusRouter = new Hono();

uploadStatusRouter.openapi({
    method: "get",
    summary: "Get upload status",
    description: "Returns the upload status of a video.",
    path: "/",
    parameters: [
        {
            name: "session_id",
            in: "query",
            required: true,
            schema: {
                type: "string",
            },
            description: "The upload session ID",
        },
    ],
    responses: {
        200: {
            description: "Get upload status",
        },
        400: {
            description: "Missing session_id",
        },
        401: {
            description: "Unauthorized",
        },
        404: {
            description: "Session not found",
        },
    },
}, async (c) => {
    try {
        authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(c.req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return c.json({ error: "missing session_id" }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (session) {
        const hasObject = await VideoReviewStorage.hasObject(session.storage);
        const status = hasObject ? "progress" : "uploaded";
        return c.json({
            status: status,
            nextRev: session.nextRev,
            title: session.title,
            folderKey: session.folderKey,
        });
    }

    const revision = await prisma.videoRevision.findFirst({
        where: { id: session_id },
    });

    if (revision) {
        return c.json({
            status: "completed",
            revisionId: revision.id,
            videoId: revision.videoId,
            revision: revision.revision,
        });
    }

    return c.json(
        { status: "not_found" },
        { status: 404 }
    );
});