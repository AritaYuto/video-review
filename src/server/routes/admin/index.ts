import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import bcrypt from "bcrypt";
import { maintenanceRouter } from "@/routes/admin/maintenance";
import { Role, isAdmin, isViewer } from "@/lib/role"

export const adminRouter = new Hono();

const CreateUserBody = z.object({
    displayName: z.string().optional(),
    role: z.enum(["viewer", "admin"]).optional(),
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

adminRouter.openapi({
    method: "post",
    summary: "Create user",
    description: "Creates a new user.",
    path: "/user",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateUserBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: "user created successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        403: {
            description: "Forbidden",
        },
        410: {
            description: "User already exists",
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

    const body = c.req.valid("json");
    const { 
        email, 
        pass,
        displayName,
        role
    } = body;

    if (!email || !pass || !role) {
        return c.json({ error: "email, pass, role are required" }, 400);
    }

    if(!isViewer(role as Role) && !isAdmin(role as Role)) {
        return c.json({ error: "The role must be either viewer or admin." }, 400);
    }

    let name = displayName ? displayName : "User"

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return c.json({ error: "User already exists. Skip." }, 410);
    }

    const hash = await bcrypt.hash(pass, 10);
    await prisma.user.create({
        data: {
            email,
            displayName: name,
            role: role,
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