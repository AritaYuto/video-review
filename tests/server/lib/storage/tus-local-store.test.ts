import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryKvStore, Upload } from "@tus/utils";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { LocalDriver } from "@/server/lib/storage/drivers/local";
import { LocalTusStore } from "@/server/lib/storage/tus/local-store";

const storageKey = "videos/projectA/scene01/rev_001.mp4";
const payload = Buffer.from(Array.from({ length: 300_000 }, (_, i) => i % 251));

let root: string;
let driver: LocalDriver;
let store: LocalTusStore;

async function startUpload(key = storageKey, size = payload.length) {
    return store.create(new Upload({ id: key, offset: 0, size }));
}

beforeEach(() => {
    root = path.join(os.tmpdir(), `videoreview-tus-${randomUUID()}`);
    fs.mkdirSync(root, { recursive: true });
    driver = new LocalDriver(root);
    store = new LocalTusStore(driver, new MemoryKvStore<Upload>());
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe("LocalTusStore", () => {
    it("refuses a storage key that points outside the storage directory", async () => {
        await expect(startUpload("../../etc/passwd")).rejects.toThrow(/outside the storage directory/);
    });
});
