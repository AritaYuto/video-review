import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import bcrypt from "bcrypt";
import { UserSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";

const UpdateProfileBody = z.object({
    userId: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

export const userRouter = createRouter()
    .openapi(createRoute({
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
                content: {
                    "application/json": {
                        schema: UserSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            403: errorResponse("Forbidden"),
            410: errorResponse("invalid userid"),
        },
    }), async (c) => {
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
        return c.json(updated, 200);
    });
