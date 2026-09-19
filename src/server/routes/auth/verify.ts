import { verifyToken } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";

// The token carries more claims (iat, exp, ...); only these are read by the client.
const TokenClaimsSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    role: z.string(),
}).loose();
type TokenClaims = z.infer<typeof TokenClaimsSchema>;

export const verifyRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Verify token",
        description: "Verifies a JWT token.",
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({ token: z.string().min(1) }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Token is valid",
                content: {
                    "application/json": {
                        schema: z.object({ valid: z.boolean(), decoded: TokenClaimsSchema }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Failed to verify token"),
        },
    }), async (c) => {
        try {
            const { token } = c.req.valid("json");

            try {
                const decoded = await verifyToken(token);
                return c.json({ valid: true, decoded: decoded as TokenClaims }, 200);
            } catch (e) {
                if (e instanceof ServerError) {
                    return c.json({ error: e.message }, e.status as 401 | 500);
                } else {
                    return c.json({ error: "invalid token" }, 401);
                }
            }
        } catch {
            return c.json({ error: "failed to verify token" }, 500);
        }
    });
