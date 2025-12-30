import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { loginAsAdmin } from "@/routes/auth/login/admin";
import { loginAsGuest } from "@/routes/auth/login/guest";
import { loginWithJira } from "@/routes/integrations/jira/auth";

export const loginRouter = new Hono();

loginRouter.openapi({
    method: "post",
    summary: "Login as admin",
    description: "Logs in a user as an admin.",
    path: "/admin",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            description: "Email of the admin user",
                        },
                        pass: {
                            type: "string",
                            description: "Password of the admin user",
                        },
                    },
                    required: ["email", "pass"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Admin login successful",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, loginAsAdmin);

loginRouter.openapi({
    method: "post",
    summary: "Login as guest",
    description: "Logs in a user as a guest.",
    path: "/guest",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        displayName: {
                            type: "string",
                            description: "Display name of the guest user",
                        },
                    },
                    required: ["displayName"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Guest login successful",
        },
        400: {
            description: "Invalid parameters",
        },
    },
}, loginAsGuest);

loginRouter.openapi({
    method: "post",
    summary: "Login with Jira",
    description: "Logs in a user with Jira credentials.",
    path: "/jira",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            description: "Email of the admin user",
                        }
                    },
                    required: ["email"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Jira login successful",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, loginWithJira);