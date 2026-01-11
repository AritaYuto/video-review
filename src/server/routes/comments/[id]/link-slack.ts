import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";

export const linkSlackRouter = new Hono();

const ParamSchema = z.object({
    id: z.string(),
});

const BodySchema = z.object({
    ts: z.string(),
    channelId: z.string(),
});

linkSlackRouter.openapi({
    method: "post",
    summary: "Link comment to Slack",
    path: "/",
    request: {
        params: ParamSchema,
        body: {
            content: {
                "application/json": {
                    schema: BodySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Linked comment to slack successfully",
        }
    },
}, async (c) => {
    const { id: commentId } = c.req.valid("param");
    const { ts, channelId } = c.req.valid("json");

    console.log("c, --------------- ", commentId, ts, channelId)

    await prisma.slackMessage.create({
        data: {
            videoCommentId: commentId,
            ts,
            channelId,
        },
    });

    return c.json({ success: true });
});