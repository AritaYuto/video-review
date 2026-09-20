import { createRoute, z } from "@hono/zod-openapi";
import { deleteCookie } from "hono/cookie";
import { createRouter } from "@/server/lib/openapi/router";
import { AUTH_COOKIE } from "@/server/lib/token";

export const logoutRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Logout",
        description: "Clears the media auth cookie.",
        path: "/",
        responses: {
            200: {
                description: "Logout successful",
                content: {
                    "application/json": {
                        schema: z.object({ ok: z.boolean() }),
                    },
                },
            },
        },
    }), async (c) => {
        deleteCookie(c, AUTH_COOKIE, { path: "/" });
        return c.json({ ok: true }, 200);
    });
