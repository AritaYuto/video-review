import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { avatar } from "@/server/lib/avatar";
import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { Readable } from "stream";
import { authorize, JwtError } from "@/server/lib/token";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { v4 as uuidv4 } from 'uuid';
import { getBaseUrl } from "@/lib/url";

export const avatarRouter = new Hono();

const GetQuerySchema = z.object({
    email: z.string().optional(),
});

const UploadBodySchema = z.object({
    email: z.string().optional(),
});

avatarRouter.openapi({
    method: "get",
    summary: "Get avatar",
    path: "/",
    request: { query: GetQuerySchema },
    responses: {
        200: {
            description: "Avatar retrieved successfully",
        }
    },
}, async (c) => {
    try {
        const query = c.req.valid("query");
        const { email } = query;

        if (!email) {
            return c.json({ avatarUrl: undefined });
        }

        const avatarUrl = await avatar(email);
        return c.json({ avatarUrl });

    } catch {
        return c.json({ avatarUrl: undefined });
    }
});

avatarRouter.openapi({
    method: "put",
    summary: "upload user avatar",
    path: "/upload",
    request: {
        body: {
            content: {
                "multipart/form-data": {
                    schema: UploadBodySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Icon upload successful",
        }
    },
}, async (c) => {
    try {
        try {
            authorize(c.req.raw, ["viewer", "admin"]);
        } catch (e) {
            if (e instanceof JwtError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const body = await c.req.parseBody();
        const email = body.email;
        const file = body.file;

        if (typeof email !== "string" || !(file instanceof File)) {
            return c.json({ error: "email and file are required" }, 400);
        }

        if (file.size > 1_000_000) {
            return c.json({ error: "file too large" }, 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const storageKey = `avatars/${uuidv4()}.png`;
        await VideoReviewStorage.directUploadFromBuffer(storageKey, Readable.from(buffer), "image/png")
        await prisma.user.update({
            where: { email },
            data: { avatarPath: storageKey },
        });
        return c.json({ ok: true });
    } catch (e) {
        return c.json({ error: "failed to upload avatar" }, 500);
    }
});