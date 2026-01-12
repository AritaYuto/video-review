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

const defaultAvatarSvg = () => {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="24" fill="#3f3f46"/>
            <circle cx="24" cy="18" r="8" fill="#e5e7eb"/>
            <path d="M8 44c2-8 12-12 16-12s14 4 16 12" fill="#e5e7eb"/>
        </svg>`.trim();
}

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
            return new NextResponse(defaultAvatarSvg(), {
                headers: {
                    "Content-Type": "image/svg+xml",
                },
            });
        }

        const baseURL = getBaseUrl(c.req.raw);
        const buffer = await avatar(baseURL, email);
        if (!buffer) {
            return new NextResponse(defaultAvatarSvg(), {
                headers: {
                    "Content-Type": "image/svg+xml",
                },
            });
        }

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "image/png",
            },
        });
    } catch {
        return new NextResponse(defaultAvatarSvg(), {
            headers: {
                "Content-Type": "image/svg+xml",
            },
        });
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