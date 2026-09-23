import { describe, expect, it } from "vitest";
import { MemoryKvStore, Upload } from "@tus/utils";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";
import { NextcloudTusStore } from "@/server/lib/storage/tus/nextcloud-store";

// Runs against the nextcloud service in compose.yml. Skipped unless it is up, and excluded
// from CI the same way the other integration tests are.
const BASE_URL = process.env.NEXTCLOUD_TEST_URL ?? "http://127.0.0.1:8080";

async function nextcloudIsUp() {
    try {
        const res = await fetch(`${BASE_URL}/status.php`);
        return res.ok;
    } catch {
        return false;
    }
}

const available = await nextcloudIsUp();
const payload = Buffer.from(Array.from({ length: 900_000 }, (_, i) => i % 251));

describe.skipIf(!available)("NextcloudTusStore against a real Nextcloud", () => {
    it("assembles a chunked upload onto the storage key", async () => {
        const driver = new NextCloudDriver(BASE_URL, "admin", "admin", `video-review-test-${randomUUID().slice(0, 8)}`);
        const store = new NextcloudTusStore(driver, new MemoryKvStore<Upload>());
        const storageKey = `videos/projectA/scene01/rev_001.mp4`;

        await store.create(new Upload({ id: storageKey, offset: 0, size: payload.length }));

        for (let offset = 0; offset < payload.length; offset += 300_000) {
            const chunk = payload.subarray(offset, offset + 300_000);
            const written = await store.write(Readable.from(chunk), storageKey, offset);
            expect(written).toBe(Math.min(offset + 300_000, payload.length));
        }

        expect(await driver.hasObject(storageKey)).toBe(true);

        const res = await fetch(driver.pathUnderRoot(storageKey), { headers: driver.getHeaders() });
        const stored = Buffer.from(await res.arrayBuffer());
        expect(stored.equals(payload)).toBe(true);

        await driver.deleteObject("");
    }, 60_000);
});
