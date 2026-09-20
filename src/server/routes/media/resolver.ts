import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { VideoReviewStorage } from "@/server/lib/storage";
import { authorize, roleOf } from "@/server/lib/token";
import { assertRoleCanSeeVideo, videoIdForStorageKey } from "@/server/lib/videos/guest-access";
import { ServerError } from "@/server/lib/server-error";

export const resolverRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Resolve media URL",
        description: "Returns the URL of a media file.",
        path: "/:path{.*}",
        responses: {
            200: {
                description: "Get media URL",
                content: {
                    "application/json": {
                        schema: z.object({ url: z.string() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            400: errorResponse("Invalid path"),
            404: errorResponse("File not found"),
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        const key = c.req.param("path");
        if (!key) {
            return c.json({ error: "invalid path" }, 400);
        }

        if (key.split("/").some(p => p.includes(".."))) {
            return c.json({ error: "invalid path" }, 400);
        }

        const role = roleOf(auth);
        if (role === "guest") {
            const videoId = await videoIdForStorageKey(key);
            if (!videoId) throw new ServerError("forbidden", 403);
            await assertRoleCanSeeVideo(videoId, role);
        }

        try {
            const url = await VideoReviewStorage.fallbackURL(key);
            console.log("Resolved URL for", key, "->", url);
            if (!url) {
                return c.json({ error: "file not found" }, 404);
            }
            return c.json({ url }, 200);
        } catch (err) {
            console.error("Error resolving media URL:", err);
            return c.json({ error: "file not found" }, 404);
        }
    });
