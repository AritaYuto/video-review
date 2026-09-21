import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerError } from "@/server/lib/server-error";

// Prisma and authorize are mocked: the test pins the response shape the trash UI
// relies on and the guard in front of it, not the database.
const prismaMock = vi.hoisted(() => ({
    video: {
        findMany: vi.fn(),
    },
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
    revisions: [{ revision: 3 }, { revision: 1 }],
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

    it("returns the deleted videos with their remaining revisions in ascending order", async () => {
        const res = await trashRequest();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            videos: [{
                id: "video-1",
                title: "Cut 010",
                folderKey: "shots",
                latestUpdatedAt: "2026-03-01T00:00:00.000Z",
                revisions: [1, 3],
            }],
        });
    });

    it("asks the database only for deleted videos and skips already purged revisions", async () => {
        await trashRequest();

        const args = prismaMock.video.findMany.mock.calls[0][0];
        expect(args.where).toEqual({ deleted: true });
        expect(args.select.revisions.where).toEqual({ deleted: false });
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
