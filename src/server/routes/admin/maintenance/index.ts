import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { z } from "zod";

export const maintenanceRouter = new Hono();

const DeleteQuerySchema = z.object({
    videoId: z.string().optional(),
    deleted: z.string().transform(v => v === "true").optional(),
});

const PurgeQuerySchema = z.object({
    videoId: z.string().optional(),
    revision: z.string().transform(v => parseInt(v)).optional(),
});

maintenanceRouter.openapi({
    method: "post",
    summary: "Update video delete flag",
    description: "Update video delete flag. deleted = true means logically deleted (hidden from UI, not physically removed)",
    path: "video/delete",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: DeleteQuerySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "The video has been successfully deleted.",
        },
        403: {
            description: "Forbidden",
        }
    },
}, async (c) => {
   // NOTE:
    // x-api-token (VIDEO_REVIEW_API_TOKEN) is the primary authentication method.
    // x-maintenance-token is kept temporarily for backward compatibility.

    const apiToken = c.req.header("x-api-token");
    const maintenanceToken = c.req.header("x-maintenance-token");

    const isApiTokenValid =
    apiToken && apiToken === process.env.VIDEO_REVIEW_API_TOKEN;

    const isLegacyMaintenanceTokenValid =
    maintenanceToken && maintenanceToken === process.env.ADMIN_MAINTENANCE_TOKEN;

    if (!isApiTokenValid && !isLegacyMaintenanceTokenValid) {
        return c.json({ error: "Forbidden" }, 403);
    }

    const body = c.req.valid("json");
    const { videoId, deleted } = body;

    if (videoId === undefined || deleted === undefined) {
        return c.json({ error: "missing required fields" }, 400);
    }

    const video = await prisma.video.findUnique({
        where: { id: videoId },
    });

    if (!video) {
        return c.json({ error: "video not found" }, 404);
    }

    await prisma.video.update({
        where: { id: videoId },
        data: { deleted },
    });

    return c.json({ success: true, videoId: videoId }, { status: 200 });
});

maintenanceRouter.openapi({
    method: "post",
    summary: "Delete actual video files and mark all related VideoRevision as deleted",
    path: "video/purge",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: PurgeQuerySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "The video revision has been successfully deleted.",
        },
        207: {
            description: "Marked as deleted, but failed to delete actual files"
        },
        403: {
            description: "Forbidden",
        }
    },
}, async (c) => {
   // NOTE:
    // x-api-token (VIDEO_REVIEW_API_TOKEN) is the primary authentication method.
    // x-maintenance-token is kept temporarily for backward compatibility.

    const apiToken = c.req.header("x-api-token");
    const maintenanceToken = c.req.header("x-maintenance-token");

    const isApiTokenValid =
    apiToken && apiToken === process.env.VIDEO_REVIEW_API_TOKEN;

    const isLegacyMaintenanceTokenValid =
    maintenanceToken && maintenanceToken === process.env.ADMIN_MAINTENANCE_TOKEN;

    if (!isApiTokenValid && !isLegacyMaintenanceTokenValid) {
        return c.json({ error: "Forbidden" }, 403);
    }

    const body = c.req.valid("json");
    const { videoId, revision } = body;

    if (videoId === undefined || revision === undefined) {
        return c.json({ error: "missing required fields" }, 400);
    }

    const whereVideoRevision: PrismaTypes.VideoRevisionWhereUniqueInput = {
        videoId_revision: { videoId, revision },
    }

    const videoRevision = await prisma.videoRevision.findUnique({
        where: whereVideoRevision,
    });

    if (!videoRevision) {
        return c.json({ error: "video not found" }, 404);
    }

    await prisma.videoRevision.update({
        where: { id: videoRevision.id },
        data: { deleted: true },
    });

    try {
        const ret = await VideoReviewStorage.deleteObject(videoRevision.filePath);
        if (!ret) {
            throw new Error("delete failed");
        }
    } catch {
        return c.json({
            warning: "VideoRevision marked as deleted, but failed to delete actual files",
            videoId,
            revision,
        }, 207)
    }

    return c.json({ success: true, videoId, revision }, { status: 200 });
});