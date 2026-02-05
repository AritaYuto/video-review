import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { PrismaTypes } from "@/lib/db-types";
import { z } from "zod";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLlamaSession, LlamaDataJson, OutputFormatPrompt } from "@/server/lib/integration-clients/llama-client";
import { VideoReviewStorage } from "@/server/lib/storage";

export const annotateRouter = new Hono();

const body = z.object({
    promptKey: z.string(),
    videoRevId: z.string().optional(),
});

annotateRouter.openapi({
    method: "post",
    summary: "",
    description: "",
    path: "/",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: body,
                },
            },
        },
    },
    responses: {
        200: { description: "" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "" }
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = c.req.valid("json");
    const { promptKey, videoRevId } = body;

    let whereVideoRevision: PrismaTypes.VideoRevisionWhereInput = {deleted: false};
    if(videoRevId) {
        whereVideoRevision.id = { equals: videoRevId };
    } else {
        whereVideoRevision.summary = { equals: null };
    }

    const videoRevs = await prisma.videoRevision.findMany({
        where: whereVideoRevision,
        select: { id: true, videoId: true },
    });

    const promptTemplate = await prisma.promptTemplate.findUnique({
        where: { key : promptKey }, 
        select: {prompt: true}
    })

    if (!promptTemplate) {
        throw new ServerError("Prompt not found", 404);
    }

    let successCount = 0;
    let failureCount = 0;

    for (const rev of videoRevs) {
        const session = await createLlamaSession();
        if (!session) {
            throw new ServerError("Failed to create Llama session", 500);
        }

        const storageKey = `video-analysis/${rev.id}.scenes.json`;
        const stream = await VideoReviewStorage.download(storageKey);

        if (!stream) {
            console.warn(`No analysis found for videoRev ${rev.id}`);
            continue;
        }

        const data = await stream.text();
        const sceneAnalysis = JSON.parse(data) as LlamaDataJson;
        const sceneText = sceneAnalysis.content.slice(0, 20).join("\n\n");
        const prompt = promptTemplate.prompt.replace("${sceneText}", sceneText) + "\n" + OutputFormatPrompt
        
        try {
            const resultJson = JSON.parse(await session.prompt(prompt));
            await prisma.videoRevision.update({
                where: { id: rev.id },
                data: {
                    summary: resultJson.summary,
                    tags: resultJson.tags
                }
            });
            successCount++;
            console.log(`Processed videoRev ${rev.id} successfully.`);
        } catch (e) {
            console.error(`Failed to process videoRev ${rev.id}:`, e);
            failureCount++;
        }
    }
    return c.json({ successCount, failureCount });
});