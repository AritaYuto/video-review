import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { PrismaTypes } from "@/lib/db-types";
import { z } from "zod";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLlamaSession, createLlama, PromptContextDataJson } from "@/server/lib/integration-clients/llama-client";
import { VideoReviewStorage } from "@/server/lib/storage";
import { Readable } from "stream";

export const metaDataRouter = new Hono();

const annotateBody = z.object({
    tags: z.string().transform((x) => x.split(",")).optional(),
    summary: z.string().optional(),
});


const llmAutoAnnotateBody = z.object({
    promptKey: z.string(),
});


const uploadBody = z.object({
    kind: z.string(),
});


metaDataRouter.openapi({
    method: "post",
    summary: "",
    description: "",
    path: "/annotate",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: annotateBody,
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

    const id = c.req.param("id");
    const body = c.req.valid("json");
    const { tags, summary } = body;

    const videoRev = await prisma.videoRevision.findUnique({
        where: { id },
        select: { id: true, videoId: true },
    });

    if (!videoRev) {
        throw new ServerError("Video revision not found", 404);
    }

    const updatedVideoRev = await prisma.videoRevision.update({
        where: { id: videoRev.id },
        data: {
            summary: summary ?? "",
            tags: tags ?? []
        }
    });
    return c.json({ videoRevision: updatedVideoRev });
});

metaDataRouter.openapi({
    method: "post",
    summary: "",
    description: "",
    path: "/llm-auto-annotate",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: llmAutoAnnotateBody,
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

    const id = c.req.param("id");
    const body = c.req.valid("json");
    const { promptKey } = body;

    let whereVideoRevision: PrismaTypes.VideoRevisionWhereInput = { deleted: false };
    if (id === "all") {
        whereVideoRevision.summary = { equals: null };
    } else {
        whereVideoRevision.id = { equals: id };
    }

    const videoRevs = await prisma.videoRevision.findMany({
        where: whereVideoRevision,
        select: { id: true, videoId: true },
    });

    const promptTemplate = await prisma.promptTemplate.findUnique({
        where: { key: promptKey },
        select: { prompt: true, kinds: true }
    })

    if (!promptTemplate) {
        throw new ServerError("Prompt not found", 404);
    }

    let successCount = 0;
    let failureCount = 0;

    const llama = await createLlama();
    if (!llama) {
        throw new ServerError("Failed to create Llama", 500);
    }

    const annotationGrammar = await llama.createGrammarForJsonSchema({
        type: "object",
        properties: {
            extracted_facts: {
                type: "string",
                description: "Extracted objective facts, character's original stance, and emotional changes from the dialogue."
            },
            summary: {
                type: "string",
                description: "A comprehensive summary of the scene based on the extracted facts."
            },
            tags: {
                type: "array",
                items: { type: "string" },
                description: "Relevant tags representing characters, situations, and emotions."
            }
        },
        required: ["extracted_facts", "summary", "tags"]
    });

    for (const rev of videoRevs) {
        const session = await createLlamaSession();
        if (!session) {
            throw new ServerError("Failed to create Llama session", 500);
        }

        let prompt = promptTemplate.prompt;
        let hasInput = false;

        for (const kind of promptTemplate.kinds) {
            const storageKey = `video-analysis/${rev.id}.${kind}.json`;
            const stream = await VideoReviewStorage.download(storageKey);

            if (!stream) {
                console.warn(`No analysis found for videoRev ${rev.id}`);
                continue;
            }

            const data = await stream.text();
            const sceneAnalysis = JSON.parse(data) as PromptContextDataJson;
            const kindText = sceneAnalysis.content.join("\n\n");

            prompt += `\n# Input ${kind} Info\n`
            prompt += kindText + "\n"

            hasInput = true;
        }

        if (!hasInput) {
            console.log(`Skip videoRev ${rev.id}: no analysis inputs.`);
            continue;
        }


        try {
            const resultText = await session.prompt(prompt, { grammar: annotationGrammar });
            const resultJson = JSON.parse(resultText);
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


metaDataRouter.openapi({
    method: "put",
    summary: "",
    description: "",
    path: "/upload",
    request: {
        body: {
            content: {
                "multipart/form-data": {
                    schema: uploadBody,
                },
            },
        },
    },
    responses: {
        200: { description: "" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        400: { description: "Missing parameters" }
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

    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const kind = body.kind;
    const file = body.file;

    if (typeof kind !== "string" || !(file instanceof File)) {
        return c.json({ error: "kind and file are required" }, 400);
    }

    const find = await prisma.promptContextKinds.findUnique({ where: { label: kind } });
    if (!find) {
        await prisma.promptContextKinds.create({ data: { label: kind } });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = `video-analysis/${id}.${kind}.json`;
    await VideoReviewStorage.directUploadFromBuffer(storageKey, Readable.from(buffer), "application/json")
    return c.json({ ok: true });
});