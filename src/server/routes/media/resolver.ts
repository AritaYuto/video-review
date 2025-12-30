import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { VideoReviewStorage } from "@/server/lib/storage";

export const resolverRouter = new Hono();

resolverRouter.openapi({
    method: "get",
    summary: "Resolve media URL",
    description: "Returns the URL of a media file.",
    path: "/:path{.*}",
    responses: {
        200: {
            description: "Get media URL",
        },
        400: {
            description: "Invalid path",
        },
        404: {
            description: "File not found",
        },
    },
}, async (c) => {
    const key = c.req.param("path");
    if(!key) {
        return c.json({ error: "invalid path" }, 400);
    }

    if (key.split("/").some(p => p.includes(".."))) {
        return c.json({ error: "invalid path" }, 400);
    }

    const url = await VideoReviewStorage.fallbackURL(key);
    if (!url) {
        return c.json({ error: "file not found" }, 404);
    }

    return c.json({ url });
});