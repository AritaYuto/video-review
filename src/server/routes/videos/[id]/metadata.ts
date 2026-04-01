import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { z } from "zod";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { randomUUID } from "crypto";

export const metaDataRouter = new Hono();

const annotateBody = z.object({
    tags: z.string().transform((x) => x.split(",")).optional(),
    summary: z.string().optional(),
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
