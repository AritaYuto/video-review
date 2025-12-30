import { JwtError, verifyToken } from "@/server/lib/token";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const verifyRouter = new Hono();

verifyRouter.openapi({
    method: "post",
    summary: "Verify token",
    description: "Verifies a JWT token.",
    path: "/",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        token: {
                            type: "string",
                            description: "JWT token to verify",
                        },
                    },
                    required: ["token"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Token is valid",
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
        const { token } = await c.req.json();

        if (!token) {
            return c.json({ error: "missing token" }, 400);
        }

        try {
            const decoded = verifyToken(token);
            return c.json(
                { valid: true, decoded },
                { status: 200 }
            );
        } catch (e) {
            if (e instanceof JwtError) {
                return c.json({ error: e.message }, e.status as any);
            } else {
                return c.json({ error: "invalid token" }, 401);
            }
        }
    } catch {
        return c.json({ error: "failed to verify token" }, 500);
    }
});