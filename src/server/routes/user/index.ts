import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import bcrypt from "bcrypt";

export const userRouter = new Hono();

const UpdateProfileBody = z.object({
    userId: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

userRouter.openapi({
    method: "patch",
    summary: "Update Profile",
    path: "/update",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: UpdateProfileBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Profile update successfully",
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
    const body = c.req.valid("json");
    const {
        userId,
        email,
        pass,
        displayName,
    } = body;

    if (!userId) {
        return c.json({ error: "userId is required" }, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id: userId },
            data: {
                ...(email ? { email } : {}),
                ...(displayName ? { displayName } : {}),
            },
        });

        if (pass) {
            const hash = await bcrypt.hash(pass, 10);

            await tx.identity.updateMany({
                where: {
                    userId,
                    provider: "local",
                },
                data: {
                    ...(email ? { providerUid: email } : {}),
                    secretHash: hash,
                },
            });
        }

        return user;
    });
    return c.json(updated, { status: 200 });
});