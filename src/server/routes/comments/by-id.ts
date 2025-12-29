import { prisma } from "@/lib/prisma";
import { Hono } from "hono";

export const byIdRouter = new Hono();

byIdRouter.get("/", async (c) => {
    try {
        const id = c.req.param("id");

        const comment = await prisma.videoComment.findUnique({
            where: { id },
        });

        // 404
        if (!comment) {
            return c.json({ error: "comment not found" }, 404);
        }

        return c.json(comment, { status: 200 });
    } catch (err) {
        console.error("[GET /api/comments/:id]", err);
        return c.json({ error: "failed to fetch comment" }, 500);
    }
});