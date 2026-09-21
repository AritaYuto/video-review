import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServerError } from "@/server/lib/server-error";

// Prisma and authorize are mocked: the test pins the response shape the trash UI
// relies on and the guard in front of it, not the database.
const prismaMock = vi.hoisted(() => ({
    video: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    videoRevision: { deleteMany: vi.fn() },
    slackMessage: { deleteMany: vi.fn() },
    slackThreadMessage: { deleteMany: vi.fn() },
    videoComment: { deleteMany: vi.fn() },
    userVideoReadStatus: { deleteMany: vi.fn() },
    vCSRevisionLink: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({
    authorize: authorizeMock,
    getJwtSecret: vi.fn(),
    getApiSecretHash: vi.fn(),
}));

import { maintenanceRouter } from "@/server/routes/admin/maintenance";

const DELETED_VIDEO = {
    id: "video-1",
    title: "Cut 010",
    folderKey: "shots",
    latestUpdatedAt: new Date("2026-03-01T00:00:00.000Z"),
    revisions: [
        { revision: 1, uploadedAt: new Date("2026-02-01T00:00:00.000Z") },
        { revision: 3, uploadedAt: new Date("2026-02-20T00:00:00.000Z") },
    ],
};

function trashRequest() {
    return maintenanceRouter.request("http://localhost/trash");
}

describe("GET /trash", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt" });
        prismaMock.video.findMany.mockResolvedValue([DELETED_VIDEO]);
    });

    it("returns the deleted videos with the revisions a delete would take", async () => {
        const res = await trashRequest();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            videos: [{
                id: "video-1",
                title: "Cut 010",
                folderKey: "shots",
                latestUpdatedAt: "2026-03-01T00:00:00.000Z",
                revisions: [
                    { revision: 1, uploadedAt: "2026-02-01T00:00:00.000Z" },
                    { revision: 3, uploadedAt: "2026-02-20T00:00:00.000Z" },
                ],
            }],
        });
    });

    it("asks the database only for deleted videos and skips already purged revisions", async () => {
        await trashRequest();

        const args = prismaMock.video.findMany.mock.calls[0][0];
        expect(args.where).toEqual({ deleted: true });
        expect(args.select.revisions.where).toEqual({ deleted: false });
        // The child rows read top to bottom, so the revisions arrive in order.
        expect(args.select.revisions.orderBy).toEqual({ revision: "asc" });
        // The tiebreak keeps the order stable for videos imported in the same batch.
        expect(args.orderBy).toEqual([{ latestUpdatedAt: "desc" }, { id: "asc" }]);
    });

    it("refuses a non-admin caller", async () => {
        authorizeMock.mockRejectedValue(new ServerError("forbidden", 403));

        const res = await trashRequest();

        expect(res.status).toBe(403);
        expect(prismaMock.video.findMany).not.toHaveBeenCalled();
    });
});

describe("POST /video/destroy", () => {
    const TRASHED = {
        title: "Cut 010",
        deleted: true,
        revisions: [{ id: "rev-1", filePath: "videos/cut010/rev_001.mp4", deleted: true }],
        comments: [{ id: "comment-1", drawingPath: "drawings/comment-1.png" }],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt" });
        prismaMock.$transaction.mockResolvedValue([]);
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function destroyRequest(videoId = "video-1") {
        return maintenanceRouter.request("http://localhost/video/destroy", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ videoId }),
        });
    }

    it("removes the record once the video is trashed and every revision is purged", async () => {
        prismaMock.video.findUnique.mockResolvedValue(TRASHED);

        const res = await destroyRequest();

        expect(res.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });

    it("deletes the dependants in an order the foreign keys allow", async () => {
        prismaMock.video.findUnique.mockResolvedValue(TRASHED);

        await destroyRequest();

        // The self-relation to the latest revision, and every child row, must go first.
        const order = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder[0];
        expect(order(prismaMock.video.update)).toBeLessThan(order(prismaMock.videoRevision.deleteMany));
        expect(order(prismaMock.vCSRevisionLink.deleteMany)).toBeLessThan(order(prismaMock.videoRevision.deleteMany));
        expect(order(prismaMock.slackThreadMessage.deleteMany)).toBeLessThan(order(prismaMock.slackMessage.deleteMany));
        expect(order(prismaMock.videoComment.deleteMany)).toBeLessThan(order(prismaMock.video.delete));
        expect(order(prismaMock.videoRevision.deleteMany)).toBeLessThan(order(prismaMock.video.delete));

        expect(prismaMock.userVideoReadStatus.deleteMany).toHaveBeenCalledWith({ where: { videoId: "video-1" } });
        // Restoring between the guard and the delete must make the update miss.
        expect(prismaMock.video.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "video-1", deleted: true } }));
    });

    it("logs the storage keys the deleted rows were the only record of", async () => {
        prismaMock.video.findUnique.mockResolvedValue(TRASHED);

        await destroyRequest();

        const logged = vi.mocked(console.warn).mock.calls[0][0] as string;
        expect(logged).toContain("videos/cut010/rev_001.mp4");
        // Thumbnails are keyed by video, not by revision (see generateThumbnail's caller).
        expect(logged).toContain("thumbnails/video-1/thumb.png");
        expect(logged).toContain("drawings/comment-1.png");
    });

    it("does not claim the files are untracked when the delete failed", async () => {
        prismaMock.video.findUnique.mockResolvedValue(TRASHED);
        prismaMock.$transaction.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));

        await destroyRequest();

        expect(console.warn).not.toHaveBeenCalled();
    });

    it("refuses a video that still has files", async () => {
        prismaMock.video.findUnique.mockResolvedValue({
            ...TRASHED,
            revisions: [{ id: "rev-1", filePath: "a.mp4", deleted: false }],
        });

        const res = await destroyRequest();

        expect(res.status).toBe(409);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a video that is not in the trash", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ ...TRASHED, deleted: false });

        const res = await destroyRequest();

        expect(res.status).toBe(409);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("answers 409 when the video changed while deleting", async () => {
        prismaMock.video.findUnique.mockResolvedValue(TRASHED);
        prismaMock.$transaction.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));

        const res = await destroyRequest();

        expect(res.status).toBe(409);
    });

    it("lets an unexpected database failure surface instead of reading as a conflict", async () => {
        prismaMock.video.findUnique.mockResolvedValue(TRASHED);
        prismaMock.$transaction.mockRejectedValue(new Error("connection lost"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        // Rethrown, so the app's onError turns it into a 500 rather than a misleading 409.
        const res = await destroyRequest();

        expect(res.status).toBe(500);
        expect(console.error).toHaveBeenCalled();
    });

    it("reports a video that is already gone", async () => {
        prismaMock.video.findUnique.mockResolvedValue(null);

        const res = await destroyRequest();

        expect(res.status).toBe(404);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a non-admin caller", async () => {
        authorizeMock.mockRejectedValue(new ServerError("forbidden", 403));

        const res = await destroyRequest();

        expect(res.status).toBe(403);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
});
