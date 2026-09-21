import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { authorize, getJwtSecret, getApiSecretHash, invalidateSecret, Secrets } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { hash, randomBytes } from "crypto";
import { env } from "@/lib/env";
import { formatVideoRes } from "@/server/lib/utils/format-video-res";
import { errorResponse } from "@/server/lib/openapi/error-response";

const DeleteQuerySchema = z.object({
    videoId: z.string().optional(),
    deleted: z.string().transform(v => v === "true").optional(),
});

const PurgeQuerySchema = z.object({
    videoId: z.string().optional(),
    revision: z.string().transform(v => parseInt(v)).optional(),
});

const DestroyBody = z.object({
    videoId: z.string(),
});

const TrashResponse = z.object({
    videos: z.array(z.object({
        id: z.string(),
        title: z.string(),
        folderKey: z.string(),
        latestUpdatedAt: z.string(),
        // Revisions still holding files. Deleting the video deletes each of these.
        revisions: z.array(z.object({
            revision: z.number(),
            uploadedAt: z.string(),
        })),
    })),
});

export const maintenanceRouter = createRouter()
    .openapi(createRoute({
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
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
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
    })
    .openapi(createRoute({
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
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
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
            for (const res of env.RESOLUTION_PRESETS) {
                const derivedStorageKey = formatVideoRes(videoRevision.filePath, res);
                await VideoReviewStorage.deleteObject(derivedStorageKey);
            }

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
    })
    .openapi(createRoute({
        method: "post",
        summary: "rotate token",
        path: "/api-token/rotate",
        responses: {
            200: {
                description: "rotate api token",
                content: {
                    "application/json": {
                        schema: z.object({ token: z.string() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const apiToken = randomBytes(32).toString("hex");
        const tokenHash = hash("sha256", apiToken);
        await prisma.systemSecret.upsert({
            where: { key: "API_TOKEN" },
            update: { valueHash: tokenHash },
            create: { key: "API_TOKEN", valueHash: tokenHash },
        });
        invalidateSecret(Secrets.API);

        return c.json({ token: apiToken }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "api token status",
        path: "/api-token/status",
        responses: {
            200: {
                description: "whether an api token is configured",
                content: {
                    "application/json": {
                        schema: z.object({ configured: z.boolean() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const configured = (await getApiSecretHash()) !== undefined;
        return c.json({ configured }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "List logically deleted videos",
        description: "The admin dialog's trash: videos with deleted = true. Unpaginated: a trash bin stays small.",
        path: "/trash",
        responses: {
            200: {
                description: "Deleted videos, most recently updated first",
                content: {
                    "application/json": {
                        schema: TrashResponse,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const videos = await prisma.video.findMany({
            where: { deleted: true },
            select: {
                id: true,
                title: true,
                folderKey: true,
                latestUpdatedAt: true,
                // Already purged revisions keep their row, so exclude them from the list.
                revisions: {
                    where: { deleted: false },
                    select: { revision: true, uploadedAt: true },
                    orderBy: { revision: "asc" },
                },
            },
            orderBy: [{ latestUpdatedAt: "desc" }, { id: "asc" }],
        });

        return c.json({
            videos: videos.map(v => ({
                ...v,
                latestUpdatedAt: v.latestUpdatedAt.toISOString(),
                revisions: v.revisions.map(r => ({ revision: r.revision, uploadedAt: r.uploadedAt.toISOString() })),
            })),
        }, 200);
    })
    .openapi(createRoute({
        method: "post",
        summary: "Delete a trashed video record",
        description: [
            "Removes the Video row and everything hanging off it (revisions, comments, read status,",
            "VCS links, Slack records). Rejects a video that is not in the trash or still has",
            "unpurged revisions.",
        ].join(" "),
        path: "video/destroy",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: DestroyBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "The video record has been removed",
                content: {
                    "application/json": {
                        schema: z.object({ success: z.boolean(), videoId: z.string() }),
                    },
                },
            },
            404: errorResponse("Video not found"),
            409: errorResponse("The video still has files, is not in the trash, or changed while deleting"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const { videoId } = c.req.valid("json");

        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: {
                title: true,
                deleted: true,
                revisions: { select: { id: true, filePath: true, deleted: true } },
                comments: { select: { id: true, drawingPath: true } },
            },
        });

        if (!video) {
            return c.json({ error: "video not found" }, 404);
        }

        if (!video.deleted || video.revisions.some(r => !r.deleted)) {
            return c.json({ error: "purge the revisions before deleting the record" }, 409);
        }

        const commentIds = video.comments.map(c => c.id);

        try {
            await prisma.$transaction([
                // Re-checking deleted here closes the window between the guard above and the delete.
                prisma.video.update({ where: { id: videoId, deleted: true }, data: { latestRevisionNum: null } }),
                prisma.slackThreadMessage.deleteMany({ where: { slackMessage: { videoCommentId: { in: commentIds } } } }),
                prisma.slackMessage.deleteMany({ where: { videoCommentId: { in: commentIds } } }),
                prisma.vCSRevisionLink.deleteMany({ where: { videoRevision: { videoId } } }),
                // Events and processing jobs cascade from the revision.
                prisma.videoRevision.deleteMany({ where: { videoId } }),
                prisma.videoComment.deleteMany({ where: { videoId } }),
                // Read status has no foreign key, so nothing else would clean it up.
                prisma.userVideoReadStatus.deleteMany({ where: { videoId } }),
                prisma.video.delete({ where: { id: videoId } }),
            ]);
        } catch (e) {
            // The guarded update misses when someone restored or deleted the video in between.
            if (e instanceof Error && (e as { code?: string }).code === "P2025") {
                return c.json({ error: "the video changed while deleting" }, 409);
            }
            console.error(`failed to destroy video ${videoId}`, e);
            throw e;
        }

        // Purging a revision can leave its file behind, and nothing ever purges thumbnails or
        // drawings. These rows were the only record of those keys, so name them for whoever has
        // to check storage by hand.
        const storageKeys = [
            ...video.revisions.flatMap(r => [
                r.filePath,
                ...env.RESOLUTION_PRESETS.map(res => formatVideoRes(r.filePath, res)),
            ]),
            `thumbnails/${videoId}/thumb.png`,
            ...video.comments.map(c => c.drawingPath).filter((p): p is string => p !== null),
        ];
        console.warn(`destroyed video ${videoId} (${video.title}); storage keys it owned: ${storageKeys.join(", ")}`);

        return c.json({ success: true, videoId }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "check status",
        path: "/status",
        responses: {
            200: {
                description: "check initialized",
                content: {
                    "application/json": {
                        schema: z.object({
                            hasAdmin: z.boolean(),
                            hasJwt: z.boolean(),
                            initialized: z.boolean(),
                        }),
                    },
                },
            },
            500: errorResponse("Unknown error"),
        },
    }), async (c) => {
        try {
            const hasAdmin = await prisma.user.count({ where: { role: "admin" } }) > 0;
            const hasJwt = await getJwtSecret() !== undefined
            return c.json({
                hasAdmin,
                hasJwt,
                initialized: hasAdmin && hasJwt,
            }, 200);
        } catch (e) {
            return c.json({ error: e instanceof ServerError ? e.message : "unknown error" }, 500);
        }
    });
