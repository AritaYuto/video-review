import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { VideoSchema } from "@/schema/zod"
import { PrismaTypes } from "@/lib/db-types";
import { z } from "zod";
import { toDateRange } from "@/lib/utils/date-helper";

export const listRouter = new Hono();

const QuerySchema = z.object({
    videoFrom: z.string().optional(),
    videoTo: z.string().optional(),
    commentsFrom: z.string().optional(),
    commentsTo: z.string().optional(),
    name: z.string().optional(),
    filterTree: z.string().optional(),
    user: z.string().optional(),
    hasDrawing: z
        .string()
        .transform(v => v === "true")
        .optional(),
    hasIssue: z
        .string()
        .transform(v => v === "true")
        .optional(),
    hasComment: z
        .string()
        .transform(v => v === "true")
        .optional(),
    includeRevisions: z
        .string()
        .transform(v => v === "true")
        .optional(),
});

listRouter.openapi({
    method: "get",
    summary: "Returns a list of videos",
    description: "Returns a list of videos filtered by date range, folder key, and title.",
    path: "/",
    request: { query: QuerySchema },
    responses: {
        200: {
            description: "List videos",
            content: {
                "application/json": {
                    schema: VideoSchema.array(),
                },
            },
        },
        500: {
            description: "Internal Server Error",
        }
    },
}, async (c) => {
    const query = c.req.valid("query");
    const {
        videoFrom,
        videoTo,
        commentsFrom,
        commentsTo,
        filterTree,
        hasDrawing,
        hasIssue,
        hasComment,
        user,
        includeRevisions,
    } = query;

    const videoDateRange = toDateRange(new Date(Number(videoFrom)), new Date(Number(videoTo)));
    const commentsDateRange = toDateRange(new Date(Number(commentsFrom)), new Date(Number(commentsTo)));

    const whereVideoComment: PrismaTypes.VideoCommentWhereInput = { deleted: false };
    const whereVideo: PrismaTypes.VideoWhereInput = { deleted: false };

    const includeVideoRevisions: PrismaTypes.VideoRevisionInclude = {}

    if (user) {
        whereVideoComment.userName = user;
    }

    if (commentsDateRange.from !== undefined && commentsDateRange.to !== undefined) {
        whereVideoComment.createdAt = { gte: commentsDateRange.from, lte: commentsDateRange.to };
    }

    if (videoDateRange.from !== undefined && videoDateRange.to !== undefined) {
        whereVideo.latestUpdatedAt = { gte: videoDateRange.from, lte: videoDateRange.to };
    }

    if (hasDrawing) {
        whereVideoComment.drawingPath = { not: null };
    }

    if (hasIssue) {
        whereVideoComment.issueId = { not: null };
    }

    if (hasComment) {
        whereVideo.comments = { some: whereVideoComment }
    }

    if (filterTree) {
        whereVideo.OR = [
            { title: { contains: filterTree } },
            { folderKey: { contains: filterTree } },
        ];
    }

    try {
        const videos = await prisma.video.findMany({
            where: whereVideo,
            ...(includeRevisions ? {
                include: {
                revisions: {
                    orderBy: { revision: "asc" },
                },
            },
            } : {}),
            orderBy: { title: "asc" },
        });
        return c.json(videos);
    } catch (err) {
        return c.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
});