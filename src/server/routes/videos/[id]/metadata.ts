import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { PrismaTypes } from "@/lib/db-types";
import { z } from "zod";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLLMClient, VideoEventContext } from "@/server/lib/integration-clients/llm-client";
import { VideoReviewStorage } from "@/server/lib/storage";
import { randomUUID } from "crypto";

export const metaDataRouter = new Hono();

const annotateBody = z.object({
    tags: z.string().transform((x) => x.split(",")).optional(),
    summary: z.string().optional(),
});


const llmAutoAnnotateBody = z.object({
    promptKey: z.string(),
    generateTags: z.string().transform(x => x === "true").optional(),
    generateSummary: z.string().transform(x => x === "true").optional(),
});


const uploadBody = z.object({
    kind: z.string().min(1),
    events: z.array(
        z.object({
            startMs: z.number().int().nonnegative(),
            endMs: z.number().int().nonnegative(),
            data: z.string().trim().min(1),
            seq: z.number().int().nonnegative().optional(),
            link: z.string().url().optional(),
        })
    ).default([]),
}).superRefine((value, ctx) => {
    value.events.forEach((event, idx) => {
        if (event.endMs < event.startMs) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["events", idx, "endMs"],
                message: "endMs must be greater than or equal to startMs",
            });
        }
    });
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
    path: "/deterministic-auto-tagging",
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


    let whereVideoRevision: PrismaTypes.VideoRevisionWhereInput = { deleted: false };
    if (id === "all") {
        whereVideoRevision.summary = { equals: null };
    } else {
        whereVideoRevision.id = { equals: id };
    }

    const videoRevs = await prisma.videoRevision.findMany({
        where: whereVideoRevision,
        include: { events: { select: { kind: true, data: true } } },
    });


    type ExistsRule = { type: "exists"; tag: string; };
    type FromDataRule = { type: "fromData"; };
    type TagRule = ExistsRule | FromDataRule;

    const tagRules: Record<string, TagRule> = {
        angle_type: { type: "fromData" },
        shot_type: { type: "fromData" },
        error_text: { type: "exists", tag: "Error" },
        dummy_text: { type: "exists", tag: "Dummy" },
    };

    let successCount = 0;
    let failureCount = 0;

    for (const rev of videoRevs) {
        const tags = rev.events.flatMap(e => {
            const rule = tagRules[e.kind.label];
            if (rule) {
                switch (rule.type) {
                    case "exists":
                        if(e.data.length > 0) {
                            return [ rule.tag ];
                        }
                        break;
                    case "fromData":
                        if (typeof e.data === "string" && e.data.length > 0) {
                            return [ e.data ];
                        }
                        break;
                }
            }
            return [];
        });

        try {
            let data: PrismaTypes.VideoRevisionUpdateInput = {
                tags: [...new Set([...rev.tags, ...tags])].filter((tag): tag is string => tag !== undefined)
            }
            await prisma.videoRevision.update({ where: { id: rev.id }, data });
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
    const { promptKey, generateTags, generateSummary } = body;

    if (!generateSummary && !generateTags) {
        return c.json({ successCount: 0, failureCount: 0 });
    }

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

    const llmClient = createLLMClient();
    if (!llmClient) {
        throw new ServerError("LLM is not configured. Set VIDEO_REVIEW_LLM_PROVIDER to enable.", 500);
    }

    const jsonInstruction = `
Respond ONLY with a JSON object matching this structure (no markdown, no explanation):
{
  "extracted_facts": "<objective facts, character stances, and emotional changes from the dialogue>",
  "summary": "<comprehensive summary of the scene>",
  "tags": ["<tag1>", "<tag2>", ...]
}`;

    for (const rev of videoRevs) {
        let prompt = promptTemplate.prompt;
        let hasInput = false;

        for (const kind of promptTemplate.kinds) {
            const storageKey = `video-analysis/${rev.id}.${kind}.json`;
            const stream = await VideoReviewStorage.download(storageKey);

            if (!stream) {
                console.warn(`No analysis found for videoRev ${rev.id}`);
                continue;
            }

            const eventJson = await stream.text();
            const eventAnalysis = JSON.parse(eventJson) as VideoEventContext;
            const kindText = eventAnalysis.events.map(e => `[${e.start_ms}-${e.end_ms}]\n${e.data}\n`);
            prompt += `\n# Input ${kind} Info\n`;
            prompt += kindText.join("\n") + "\n";

            hasInput = true;
        }

        if (!hasInput) {
            console.log(`Skip videoRev ${rev.id}: no analysis inputs.`);
            continue;
        }

        try {
            const resultText = await llmClient.complete(prompt + jsonInstruction);
            const resultJson = JSON.parse(resultText);
            let data: PrismaTypes.VideoRevisionUpdateInput = {};
            if (generateSummary) {
                data.summary = resultJson.summary;
            }
            if (generateTags) {
                data.tags = resultJson.tags;
            }
            await prisma.videoRevision.update({ where: { id: rev.id }, data });
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
                "application/json": {
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
    const body = c.req.valid("json");
    const { kind, events } = body;

    const revision = await prisma.videoRevision.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!revision) {
        return c.json({ error: "video revision not found" }, 404);
    }

    const eventKind = await prisma.videoEventKind.upsert({
        where: { label: kind },
        update: {},
        create: { label: kind },
    });

    await prisma.$transaction(async (tx) => {
        await tx.videoEvent.deleteMany({
            where: {
                videoRevisionId: revision.id,
                kindId: eventKind.id,
            },
        });

        if (events.length === 0) {
            return;
        }

        await tx.videoEvent.createMany({
            data: events.map((event, idx) => ({
                id: randomUUID(),
                videoRevisionId: revision.id,
                kindId: eventKind.id,
                startMs: event.startMs,
                endMs: event.endMs,
                data: event.data,
                seq: event.seq ?? idx,
                link: event.link,
            })),
        });
    });

    return c.json({ ok: true, inserted: events.length });
});
