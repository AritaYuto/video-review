import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { createSession } from "@/server/lib/upload-session";
import { UploadStorageType } from "@/lib/db-types";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { UploadSessionSchema } from "@/schema/zod";
import { v4 as uuidv4 } from 'uuid';

export const initRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Initialize drawing upload",
        description: "Initializes the drawing upload process.",
        path: "/",
        request: {
            body: {
                content: {
                    "multipart/form-data": {
                        // Empty means "allocate a new key"; the client sends the existing key when overwriting.
                        schema: z.object({ path: z.string().optional() }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Drawing upload initialized successfully",
                content: {
                    "application/json": {
                        schema: z.object({ url: z.string(), session: UploadSessionSchema }),
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

        const { path: savePath } = c.req.valid("form");
        const storageKey = savePath ? savePath : `drawing/${uuidv4()}.png`;

        const type = VideoReviewStorage.type();
        const session = await createSession({
            nextRev: 0,
            title: "",
            folderKey: "",
            scenePath: "",
            vcsWatchPaths: [],
            storageKey,
            storage: type as UploadStorageType,
        });
        const url = await VideoReviewStorage.uploadURL(session.id, storageKey, "image/png");
        return c.json({ url, session }, 200);
    });
