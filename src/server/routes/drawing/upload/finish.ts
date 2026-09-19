import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { errorResponse } from "@/server/lib/openapi/error-response";

export const finishRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Finish drawing upload",
        description: "Finishes the drawing upload process.",
        path: "/",
        request: { query: z.object({ session_id: z.string().min(1) }) },
        responses: {
            200: {
                description: "Drawing upload finished successfully",
                content: {
                    "application/json": {
                        schema: z.object({ filePath: z.string() }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin", "guest"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const { session_id } = c.req.valid("query");

        const session = await getSession(session_id);
        if (!session) {
            return c.json({ error: "missing session" }, 400);
        }

        const storageKey = session.storageKey;

        await deleteSession(session_id);
        return c.json({ filePath: storageKey }, 200);
    });
