import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { maintenanceRouter } from "@/routes/admin/maintenance";
import { authorize, JwtError } from "@/server/lib/token";
import { ContentfulStatusCode } from "hono/utils/http-status";
import bcrypt from "bcrypt";
import { hash, randomBytes } from "crypto";

export const adminRouter = new Hono();

const CreateAdminBody = z.object({
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

const CreateUserBody = z.object({
    displayName: z.string().optional(),
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

const UpdateRoleBody = z.object({
    userId: z.string().optional(),
    role: z.enum(["viewer", "admin"]).optional(),
});

adminRouter.openapi({
    method: "post",
    summary: "boostrap",
    path: "/bootstrap",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateAdminBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: "admin user created successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        410: {
            description: "admin user already exists",
        },
    },
}, async (c) => {
    const body = c.req.valid("json");
    const {
        email,
        pass,
    } = body;

    if (await prisma.user.count() > 0) {
        return c.json({ error: "Already initialized" }, 410);
    }

    if (!email || !pass) {
        return c.json({ error: "email, pass, role are required" }, 400);
    }

    const exists = await prisma.systemSecret.findUnique({
        where: { key: "JWT_SECRET" },
    });

    if (exists) {
        return c.json({ error: "Already initialized" }, 410);
    }

    const jwtSecret = randomBytes(64).toString("hex");
    await prisma.systemSecret.create({
        data: {
            key: "JWT_SECRET",
            valueHash: hash("sha256", jwtSecret),
        },
    });

    await prisma.user.create({
        data: {
            email,
            displayName: "admin",
            role: "admin",
            identities: {
                create: {
                    provider: "password",
                    providerUid: email,
                    secretHash: await bcrypt.hash(pass, 10),
                },
            },
        },
    });
    return c.json({ success: true }, { status: 200 });
});

adminRouter.openapi({
    method: "post",
    summary: "Create user(only viewer)",
    description: "Creates a new user.",
    path: "/create-user",
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
    try {
        await authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = c.req.valid("json");
    const {
        email,
        pass,
        displayName,
    } = body;

    if (!email || !pass) {
        return c.json({ error: "email, pass, role are required" }, 400);
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
            role: "viewer",
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

adminRouter.openapi({
    method: "patch",
    summary: "Update role",
    path: "/role-update",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: UpdateRoleBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Role update successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        403: {
            description: "Forbidden",
        },
        410: {
            description: "invalid userid",
        },
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = c.req.valid("json");
    const { userId, role } = body;

    if (!userId) {
        return c.json({ error: "userId is required" }, 400);
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
    });
    return c.json(updated, { status: 200 });
});

adminRouter.route("/maintenance", maintenanceRouter);