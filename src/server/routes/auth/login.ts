import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { loginUser, loginAsGuest, loginWithJira } from "@/server/lib/login";
import { ServerError } from "@/server/lib/server-error";

export const loginRouter = new Hono();

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

loginRouter.openapi({
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
        200: { description: "login successful" },
        400: { description: "Invalid parameters" },
        401: { description: "Unauthorized" },
    },
}, async (c) => {
    try{
        const body = c.req.valid("json");
        const response = await loginUser({
            ...body,
            displayName: "",
        });
        return c.json(response);
    } catch(e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
});

loginRouter.openapi({
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
        200: { description: "login successful" },
        400: { description: "Invalid parameters" },
        401: { description: "Unauthorized" },
    },
}, async (c) => {
    try{
        const body = c.req.valid("json");
        const response = await loginAsGuest({
            ...body,
            email: "",
            password: "",
        });
        return c.json(response);
    } catch(e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
});

loginRouter.openapi({
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
        200: { description: "login successful" },
        400: { description: "Invalid parameters" },
        401: { description: "Unauthorized" },
    },
}, async (c) => {
    try{
        const body = c.req.valid("json");
        const response = await loginWithJira({
            ...body,
            displayName: "",
            password: "",
        });
        return c.json(response);
    } catch(e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
});