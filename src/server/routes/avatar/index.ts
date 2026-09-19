import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { avatarIntegration, avatarLocal } from "@/server/lib/avatar";
import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { Readable } from "stream";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { v4 as uuidv4 } from 'uuid';

const GetQuerySchema = z.object({
    email: z.string().optional(),
});

const UploadBodySchema = z.object({
    email: z.string().optional(),
    // Binary format must be spelled out: zod-openapi cannot map z.file() on its own.
    file: z.file().optional().openapi({ type: "string", format: "binary" }),
});

export const avatarRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get avatar",
        path: "/local",
        request: { query: GetQuerySchema },
        responses: {
            200: {
                description: "Avatar retrieved successfully",
                content: {
                    "application/json": {
                        schema: z.object({ avatarUrl: z.string().optional() }),
                    },
                },
            },
        },
    }), async (c) => {
        try {
            const { email } = c.req.valid("query");

            if (!email) {
                return c.json({ avatarUrl: undefined }, 200);
            }

            const avatarUrl = await avatarLocal(email);
            return c.json({ avatarUrl }, 200);

        } catch {
            return c.json({ avatarUrl: undefined }, 200);
        }
    })
    .openapi(createRoute({
        method: "get",
        summary: "Get avatar",
        path: "/integration",
        request: { query: GetQuerySchema },
        responses: {
            200: {
                description: "Avatar retrieved successfully",
            }
        },
    }), async (c) => {
        try {
            const { email } = c.req.valid("query");

            if (!email) {
                return new NextResponse(null, { status: 204 });
            }

            const result = await avatarIntegration(email);
            if (!result) {
                return new NextResponse(null, { status: 204 });
            }

            return new NextResponse(result.buffer, { status: 200 });
        } catch {
            return new NextResponse(null, { status: 204 });
        }
    })
    .openapi(createRoute({
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
                content: {
                    "application/json": {
                        schema: z.object({ ok: z.boolean() }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Failed to upload avatar"),
        },
    }), async (c) => {
        try {
            try {
                await authorize(c.req.raw, ["viewer", "admin"]);
            } catch (e) {
                if (e instanceof ServerError) {
                    return c.json({ error: e.message }, e.status as 401 | 403 | 500);
                }
                return c.json({ error: "unauthorized" }, 401);
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
            return c.json({ ok: true }, 200);
        } catch (e) {
            return c.json({ error: "failed to upload avatar" }, 500);
        }
    });
