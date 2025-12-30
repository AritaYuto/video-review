import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import * as z from "@/schema/zod"

export const listRouter = new Hono();

listRouter.openapi({
    method: "get",
    summary: "Returns a list of videos",
    description: "Returns a list of videos filtered by date range, folder key, and title.",
    path: "/",
    parameters: [
        {
            name: "from",
            in: "query",
            description: "Start of the date range (inclusive) in milliseconds since epoch",
            required: false,
            schema: {
                type: "string",
                format: "date-time",
            },
        },
        {
            name: "to",
            in: "query",
            description: "End of the date range (inclusive) in milliseconds since epoch",
            required: false,
            schema: {
                type: "string",
                format: "date-time",
            },
        },
        {
            name: "target",
            in: "query",
            description: "Fetch videos updated before this date (in milliseconds since epoch)",
            required: false,
            schema: {
                type: "string",
                format: "date-time",
            },
        },
        {
            name: "folderKey",
            in: "query",
            description: "Filter videos by folder key (partial match)",
            required: false,
            schema: {
                type: "string",
            },
        },
        {
            name: "title",
            in: "query",
            description: "Filter videos by exact title match",
            required: false,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "List videos",
            content: {
                "application/json": {
                    schema: z.VideoSchema.array(),
                },
            },
        },
        500: {
            description: "Internal Server Error",
        }
    },
},
async (c) => {
    const { searchParams } = new URL(c.req.url);
    const fromMs = searchParams.get("from");
    const toMs = searchParams.get("to");
    const targetMs = searchParams.get("target");
    const folderKey = searchParams.get("folderKey");
    const title = searchParams.get("title");

    const fromDate = fromMs ? new Date(Number(fromMs)) : undefined;
    const toDate = toMs ? new Date(Number(toMs)) : undefined;
    const targetDate = targetMs ? new Date(Number(targetMs)) : undefined;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const dateFilter =
        fromDate && toDate
            ? {
                latestUpdatedAt: {
                    gte: fromDate,
                    lte: toDate,
                },
            }
            : targetDate
                ? {
                    latestUpdatedAt: {
                        lt: targetDate,
                    },
                }
                : {};

    try {
        const videos = await prisma.video.findMany({
            where: {
                ...dateFilter,
                ...(title ? { title } : {}),
                ...(folderKey ? { folderKey: { contains: folderKey, } } : {})
            },
            select: {
                id: true,
                title: true,
                folderKey: true,
                scenePath: true,
                latestUpdatedAt: true,
            },
            orderBy: { title: "asc" },
        });

        return c.json(videos);
    } catch (err) {
        return c.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
});