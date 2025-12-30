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
    summary: "Transfer drawing",
    description: "Transfers a drawing to the specified storage.",
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
            description: "Drawing transferred successfully",
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
        return c.json({ error: "missing session_id" }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (!session) {
        return c.json({ error: "missing session" }, { status: 400 });
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
        return c.json({ error: "missing file" }, { status: 400 });
    }

    const tmpDir = path.join(process.cwd(), "uploads", "tmp");
    fs.promises.mkdir(tmpDir, { recursive: true });
    const tmpFilePath = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(tmpFilePath, buffer);

    const fullPath = path.join(process.cwd(), "uploads", session.storageKey);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.rename(tmpFilePath, fullPath);

    if (fs.existsSync(tmpFilePath)) {
        fs.rmSync(tmpFilePath);
    }

    return c.json({ ok: true });
});

transferRouter.openapi({
    method: "put",
    summary: "Transfer drawing to Nextcloud",
    description: "Transfers a drawing to the Nextcloud storage.",
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
            description: "Drawing transferred successfully",
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
        return c.json({ error: "missing session_id" }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (!session) {
        return c.json({ error: "missing session" }, { status: 400 });
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
        return c.json({ error: "missing file" }, { status: 400 });
    }

    const tmpDir = path.join(process.cwd(), "uploads", "tmp");
    fs.promises.mkdir(tmpDir, { recursive: true });
    const tmpFilePath = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(tmpFilePath, buffer);


    console.log("Uploading to Nextcloud:", session.storageKey);

    await nextCloudClient!.put(
        session.storageKey,
        fs.createReadStream(tmpFilePath)
    );
    await fs.promises.rm(tmpFilePath);
    return c.json({ ok: true });
});