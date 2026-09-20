import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, roleOf } from "@/server/lib/token";

export const foldersRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get all folder keys",
        description: "Returns a list of all unique folder keys from the database.",
        path: "/",
        responses: {
            200: {
                description: "List of folder keys",
                content: {
                    "application/json": {
                        schema: z.array(z.string()),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            500: {
                description: "Internal Server Error",
            },
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);
        const role = roleOf(auth);

        try {
            const keys = await prisma.video.findMany({
                where: role === "guest" ? { guestVisible: true } : {},
                select: { folderKey: true },
                distinct: ["folderKey"],
                orderBy: { folderKey: "asc" },
            });
            return c.json(keys.map((k) => k.folderKey));
        } catch {
            return c.json({ error: "Failed to fetch folders" }, { status: 500 });
        }
    });
