import { describe, expect, it, vi } from "vitest";

import { LocalDriver } from "@/server/lib/storage/drivers/local";

const driver = new LocalDriver("/storage");
const storageKey = "videos/projectA/scene01/rev_001.mp4";

describe("LocalDriver.uploadURL", () => {
    it("sends a video through the chunked route", async () => {
        const url = await driver.uploadURL("session-1", storageKey, "video/mp4");

        expect(url).toBe("/api/v1/videos/upload/tus");
    });

    it("keeps a drawing on the single-request route", async () => {
        const url = await driver.uploadURL("session-1", "drawings/a.png", "image/png");

        expect(url).toBe("/api/v1/drawing/upload/transfer?session_id=session-1");
    });

});
