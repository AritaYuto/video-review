import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ chunked: false }));

vi.mock("@/server/lib/env/storage-env", () => ({
    env: {
        get VIDEO_REVIEW_UPLOAD_CHUNKED() {
            return mocks.chunked;
        },
    },
}));

import { LocalDriver } from "@/server/lib/storage/drivers/local";

const driver = new LocalDriver("/storage");
const storageKey = "videos/projectA/scene01/rev_001.mp4";

describe("LocalDriver.uploadURL", () => {
    it("sends a video through the single-request route by default", async () => {
        mocks.chunked = false;

        const url = await driver.uploadURL("session-1", storageKey, "video/mp4");

        expect(url).toBe("/api/v1/videos/upload/transfer?session_id=session-1");
    });

    it("sends a video through the chunked route once the switch is on", async () => {
        mocks.chunked = true;

        const url = await driver.uploadURL("session-1", storageKey, "video/mp4");

        expect(url).toBe("/api/v1/videos/upload/tus");
    });

});
