import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import bcrypt from "bcrypt";
import { UserSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

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
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            410: errorResponse("invalid userid"),
        },
    }), async (c) => {
        // Guests are excluded: only a signed-in viewer/admin may edit a profile.
        // A failure throws to app.onError, like the other guarded routes.
        const auth = await authorize(c.req.raw, ["viewer", "admin"]);

        const body = c.req.valid("json");
        const {
            userId,
            email,
            pass,
            displayName,
        } = body;

        // A profile can only be edited by its owner. An api-token caller carries no
        // user id, so it can never be the owner and is refused as well.
        const callerId = auth.type === "jwt" ? auth.decoded.id : undefined;
        if (!userId || !callerId || userId !== callerId) {
            return c.json({ error: "forbidden" }, 403);
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
