import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { authorize, JwtError } from "@/server/lib/token";
import { getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { receiveMultipart } from "@/server/lib/utils/receive-multipart";
import fs from "fs";
import path from "path";
import { nextCloudClient } from "@/server/lib/storage/integrations/nextcloud";

export const transferRouter = new Hono();

transferRouter.openapi({
    method: "put",
    summary: "Transfer upload data",
    description: "Transfers the uploaded video data to the server storage.",
    path: "/local",
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
    requestBody: {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    type: "object",
                    properties: {
                        file: {
                            type: "string",
                            format: "binary",
                            description: "The drawing file to upload",
                        },
                    },
                    required: ["file"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transfer local",
        },
        400: {
            description: "Bad request",
        },
        401: {
            description: "Unauthorized",
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
    if (!session) {
        return c.json({ error: "missing session" }, { status: 400 });
    }

    return receiveMultipart(c.req.raw, async (tmpFilePath: string) => {
        const fullPath = path.join(process.cwd(), "uploads", session.storageKey);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.rename(tmpFilePath, fullPath);

        if (fs.existsSync(tmpFilePath)) {
            fs.rmSync(tmpFilePath);
        }
    });
});

transferRouter.openapi({
    method: "put",
    summary: "Transfer upload data to Nextcloud",
    description: "Transfers the uploaded video data to Nextcloud storage.",
    path: "/nextcloud",
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
    requestBody: {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    type: "object",
                    properties: {
                        file: {
                            type: "string",
                            format: "binary",
                            description: "The drawing file to upload",
                        },
                    },
                    required: ["file"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transfer nextcloud",
        },
        400: {
            description: "Bad request",
        },
        401: {
            description: "Unauthorized",
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
    if (!session) {
        return c.json({ error: "missing session" }, { status: 400 });
    }

    return receiveMultipart(c.req.raw, async (tmpFilePath) => {
        await nextCloudClient!.put(
            session.storageKey,
            fs.createReadStream(tmpFilePath)
        );
        await fs.promises.rm(tmpFilePath);
    });
});