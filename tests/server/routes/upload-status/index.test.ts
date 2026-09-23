import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";

const mocks = vi.hoisted(() => ({
    hasObject: vi.fn(),
}));

vi.mock("@/server/lib/token", () => ({
    authorize: vi.fn(),
}));

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        hasObject: mocks.hasObject,
    },
}));

import { authorize } from "@/server/lib/token";
import { uploadStatusRouter } from "@/server/routes/upload-status";

const createdVideoIds: string[] = [];
const createdSessionIds: string[] = [];

async function createUploadSession(storageKey: string) {
    const id = randomUUID();
    await prisma.uploadSession.create({
        data: {
            id,
            title: `Upload Status ${id.slice(0, 8)}`,
            folderKey: `upload-status-tests-${id.slice(0, 8)}`,
            scenePath: null,
            nextRev: 1,
            storage: "local",
            storageKey,
        },
    });
    createdSessionIds.push(id);
    return id;
}

describe("uploadStatusRouter (DB)", () => {
    beforeEach(() => {
        mocks.hasObject.mockReset();
        vi.mocked(authorize).mockResolvedValue({ type: "api-token", role: "admin" });
    });

    afterAll(async () => {
        if (createdSessionIds.length > 0) {
            await prisma.uploadSession.deleteMany({ where: { id: { in: createdSessionIds } } });
        }

        if (createdVideoIds.length > 0) {
            await prisma.video.updateMany({
                where: { id: { in: createdVideoIds } },
                data: { latestRevisionNum: null },
            });
            await prisma.videoRevision.deleteMany({ where: { videoId: { in: createdVideoIds } } });
            await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
        }
    });

    it("reports progress while the file has not reached storage", async () => {
        mocks.hasObject.mockResolvedValue(false);
        const storageKey = `videos/upload-status/${randomUUID()}/rev_001.mp4`;
        const sessionId = await createUploadSession(storageKey);

        const res = await uploadStatusRouter.request(`http://localhost/?session_id=${sessionId}`);

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ status: "progress" });
        expect(mocks.hasObject).toHaveBeenCalledWith(storageKey);
    });

    it("reports uploaded once the file is in storage", async () => {
        mocks.hasObject.mockResolvedValue(true);
        const sessionId = await createUploadSession(`videos/upload-status/${randomUUID()}/rev_001.mp4`);

        const res = await uploadStatusRouter.request(`http://localhost/?session_id=${sessionId}`);

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ status: "uploaded" });
    });

    it("reports completed when the session is gone and a revision exists", async () => {
        const videoId = randomUUID();
        const sessionId = randomUUID();
        await prisma.video.create({
            data: {
                id: videoId,
                title: `Upload Status ${sessionId.slice(0, 8)}`,
                folderKey: `upload-status-tests-${sessionId.slice(0, 8)}`,
                deleted: false,
            },
        });
        createdVideoIds.push(videoId);
        await prisma.videoRevision.create({
            data: {
                id: sessionId,
                videoId,
                revision: 1,
                filePath: `videos/upload-status/${videoId}/rev_001.mp4`,
            },
        });

        const res = await uploadStatusRouter.request(`http://localhost/?session_id=${sessionId}`);

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ status: "completed", videoId, revision: 1 });
    });

    it("returns 404 when neither a session nor a revision exists", async () => {
        const res = await uploadStatusRouter.request(`http://localhost/?session_id=${randomUUID()}`);

        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({ status: "not_found" });
    });
});
