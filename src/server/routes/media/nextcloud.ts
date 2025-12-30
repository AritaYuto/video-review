import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { nextCloudClient } from "@/server/lib/storage/integrations/nextcloud";

export const nextCloudRouter = new Hono();

nextCloudRouter.openapi({
    method: "get",
    summary: "Get media from Nextcloud",
    description: "Returns the media file from Nextcloud.",
    path: "/:path{.*}",
    responses: {
        200: {
            description: "Get media from Nextcloud",
        },
        400: {
            description: "Invalid path",
        },
        404: {
            description: "File not found",
        },
    },
}, async (c) => {
    const relativePath = c.req.param('path');
    if(!relativePath) {
        return c.json({ error: "missing path" }, 400);
    }
    const pathSegments = relativePath.split("/");
    if(!pathSegments.length) {
        return c.json({ error: "missing path" }, 400);
    }

    if (pathSegments.some(p => p.includes(".."))) {
        return c.json({ error: "invalid path" }, 400);
    }

    if (!nextCloudClient) {
        return c.json({ error: "Nextcloud client not configured" }, 500);
    }

    const ncPath = pathSegments.join("/");
    const ncUrl = nextCloudClient.pathUnderRoot(ncPath);
    const range = c.req.header("range");
    const res = await fetch(ncUrl, {
        method: "GET",
        headers: {
            ...nextCloudClient.getHeaders(),
            ...(range ? { Range: range } : {}),
        },
    });

    if (!res.ok || !res.body) {
        return c.json({ error: "failed to fetch media" }, 500);
    }

    const headers = new Headers();
    res.headers.forEach((value, key) => {
        headers.set(key, value);
    });

    return new Response(res.body, {
        status: res.status,
        headers,
    });
});
