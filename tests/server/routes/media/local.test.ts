import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/token", () => ({
    authorizeMedia: vi.fn(async () => undefined),
}));

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        getDriver: () => ({
            type: () => "local",
            localBaseDirectory: "/tmp/vr-local-test-root",
        }),
    },
}));

import { localRouter } from "@/server/routes/media/local";

describe("media localRouter", () => {
    it("rejects a path that escapes the storage root", async () => {
        // Encoded slashes (%2f) survive URL normalization and reach the handler as
        // "../", where path.join would escape the root without this guard.
        const res = await localRouter.request("http://localhost/%2e%2e%2f%2e%2e%2fetc%2fpasswd");
        expect(res.status).toBe(400);
    });

    it("lets a path inside the root through the traversal guard", async () => {
        const res = await localRouter.request("http://localhost/videos/demo.mp4");
        expect(res.status).not.toBe(400);
    });
});
