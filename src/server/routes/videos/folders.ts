import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const foldersRouter = new Hono();

foldersRouter.openapi({
    method: "get",
    summary: "Get all folder keys",
    description: "Returns a list of all unique folder keys from the database.",
    path: "/",
    responses: {
        200: {
            description: "List of folder keys",
        },
    },
}, 
async (c) => {
    const keys = await prisma.video.findMany({
        select: { folderKey: true },
        distinct: ["folderKey"],
        orderBy: { folderKey: "asc" },
    });
    return c.json(keys.map((k) => k.folderKey));
});