import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import bcrypt from "bcrypt";
import { maintenanceRouter } from "@/routes/admin/maintenance";

export const adminRouter = new Hono();

adminRouter.openapi({
    method: "post",
    summary: "Create admin user",
    description: "Creates a new admin user.",
    path: "/user",
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
            description: "Admin user created successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        403: {
            description: "Forbidden",
        },
        410: {
            description: "Admin already exists",
        },
    },
}, async (c) => {
    // NOTE:
    // x-api-token (VIDEO_REVIEW_API_TOKEN) is the primary authentication method.
    // x-maintenance-token is kept temporarily for backward compatibility.

    const apiToken = c.req.header("x-api-token");
    const maintenanceToken = c.req.header("x-maintenance-token");

    const isApiTokenValid =
    apiToken && apiToken === process.env.VIDEO_REVIEW_API_TOKEN;

    const isLegacyMaintenanceTokenValid =
    maintenanceToken && maintenanceToken === process.env.ADMIN_MAINTENANCE_TOKEN;

    if (!isApiTokenValid && !isLegacyMaintenanceTokenValid) {
        return c.json({ error: "Forbidden" }, 403);
    }

    const { email, pass } = await c.req.json();
    if (!email || !pass) {
        return c.json({ error: "email and pass are required" }, 400);
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return c.json({ error: "Admin already exists. Skip." }, 410);
    }

    const hash = await bcrypt.hash(pass, 10);
    await prisma.user.create({
        data: {
            email,
            displayName: "admin",
            role: "admin",
            identities: {
                create: {
                    provider: "password",
                    providerUid: email,
                    secretHash: hash,
                },
            },
        },
    });
    return c.json({ success: true }, { status: 200 });
});

adminRouter.route("/maintenance", maintenanceRouter);