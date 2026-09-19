import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { loginUser, loginAsGuest, loginWithJira } from "@/server/lib/login";
import { ServerError } from "@/server/lib/server-error";
import { errorResponse } from "@/server/lib/openapi/error-response";

const loginUserSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

const loginGuestSchema = z.object({
    displayName: z.string().min(1),
});

const loginJIRASchema = z.object({
    email: z.email(),
});

const LoginResponseSchema = z.object({
    token: z.string(),
    id: z.string(),
    email: z.string().nullable().optional(),
    displayName: z.string(),
    role: z.enum(["guest", "viewer", "admin"]),
});

export const loginRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Login as admin",
        description: "Logs in a user as an admin.",
        path: "/user",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: loginUserSchema,
                    },
                },
                required: true,
            },
        },
        responses: {
            200: {
                description: "login successful",
                content: {
                    "application/json": {
                        schema: LoginResponseSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Login failed"),
        },
    }), async (c) => {
        try{
            const body = c.req.valid("json");
            const response = await loginUser({
                ...body,
                displayName: "",
            });
            return c.json(response, 200);
        } catch(e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 400 | 401 | 500);
            } else {
                return c.json({ error: "failed to login" }, 500);
            }
        }
    })
    .openapi(createRoute({
        method: "post",
        summary: "Login as guest",
        description: "Logs in a user as a guest.",
        path: "/guest",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: loginGuestSchema,
                    },
                },
                required: true,
            },
        },
        responses: {
            200: {
                description: "login successful",
                content: {
                    "application/json": {
                        schema: LoginResponseSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Login failed"),
        },
    }), async (c) => {
        try{
            const body = c.req.valid("json");
            const response = await loginAsGuest({
                ...body,
                email: "",
                password: "",
            });
            return c.json(response, 200);
        } catch(e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 400 | 401 | 500);
            } else {
                return c.json({ error: "failed to login" }, 500);
            }
        }
    })
    .openapi(createRoute({
        method: "post",
        summary: "Login with Jira",
        description: "Logs in a user with Jira credentials.",
        path: "/jira",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: loginJIRASchema,
                    },
                },
                required: true,
            },
        },
        responses: {
            200: {
                description: "login successful",
                content: {
                    "application/json": {
                        schema: LoginResponseSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Login failed"),
        },
    }), async (c) => {
        try{
            const body = c.req.valid("json");
            const response = await loginWithJira({
                ...body,
                displayName: "",
                password: "",
            });
            return c.json(response, 200);
        } catch(e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 400 | 401 | 500);
            } else {
                return c.json({ error: "failed to login" }, 500);
            }
        }
    });
