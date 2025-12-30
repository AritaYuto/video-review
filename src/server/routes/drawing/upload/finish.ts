import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { authorize, JwtError } from "@/server/lib/token";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const finishRouter = new Hono();

finishRouter.openapi({
    method: "post",
    summary: "Finish drawing upload",
    description: "Finishes the drawing upload process.",
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
            description: "Drawing upload finished successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, async (c) => {
    try {
        authorize(c.req.raw, ["viewer", "admin", "guest"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(c.req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return c.json({ message: "missing session_id" }, 400);
    }

    const session = await getSession(session_id);
    if (!session) {
        return c.json({ message: "missing session" }, 400);
    }

    const storageKey = session.storageKey;

    await deleteSession(session_id);
    return c.json(
        { filePath: storageKey },
        { status: 200 }
    );
});