import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { avatar } from "@/server/lib/avatar";
import { NextResponse } from "next/server";

const defaultAvatarSvg = () => {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="24" fill="#3f3f46"/>
            <circle cx="24" cy="18" r="8" fill="#e5e7eb"/>
            <path d="M8 44c2-8 12-12 16-12s14 4 16 12" fill="#e5e7eb"/>
        </svg>`.trim();
}

export const avatarRouter = new Hono();

const QuerySchema = z.object({
    email: z.string().optional(),
});

avatarRouter.openapi({
    method: "get",
    summary: "Get avatar",
    path: "/",
    request: { query: QuerySchema },
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
                    "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
                },
            });
        }

        const buffer = await avatar(email);
        if (!buffer) {
            return new NextResponse(defaultAvatarSvg(), {
                headers: {
                    "Content-Type": "image/svg+xml",
                    "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
                },
            });
        }

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
            },
        });
    } catch {
        return new NextResponse(defaultAvatarSvg(), {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
            },
        });
    }
});