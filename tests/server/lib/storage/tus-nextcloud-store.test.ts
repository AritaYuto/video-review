import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MemoryKvStore, Upload } from "@tus/utils";
import http from "node:http";
import { Readable } from "node:stream";

import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";
import { NextcloudTusStore } from "@/server/lib/storage/tus/nextcloud-store";

const storageKey = "videos/projectA/scene01/rev_001.mp4";
const payload = Buffer.from(Array.from({ length: 300_000 }, (_, i) => i % 251));

/**
 * Stands in for Nextcloud: it keeps the uploaded chunks and, on MOVE of ".file", joins them in
 * name order the way Nextcloud assembles a chunked upload.
 */
class StubNextcloud {
    readonly chunks = new Map<string, Buffer>();
    readonly collections: string[] = [];
    readonly files = new Map<string, Buffer>();
    private server?: http.Server;

    async start(): Promise<string> {
        this.server = http.createServer(async (req, res) => {
            const url = new URL(req.url!, "http://stub");
            const body = await readBody(req);

            switch (req.method) {
                case "MKCOL":
                    this.collections.push(url.pathname);
                    res.writeHead(url.pathname.includes("/files/") ? 405 : 201).end();
                    return;

                case "PUT":
                    this.chunks.set(url.pathname, body);
                    res.writeHead(201).end();
                    return;

                case "GET": {
                    const stored = [...this.files.entries()]
                        .find(([name]) => name.endsWith(url.pathname))?.[1];

                    if (!stored) {
                        res.writeHead(404).end();
                        return;
                    }
                    res.writeHead(200).end(stored);
                    return;
                }

                case "DELETE":
                    for (const name of [...this.chunks.keys()]) {
                        if (name.startsWith(url.pathname)) this.chunks.delete(name);
                    }
                    res.writeHead(204).end();
                    return;

                case "HEAD": {
                    const stored = this.files.get(`http://stub${url.pathname}`)
                        ?? [...this.files.entries()].find(([name]) => name.endsWith(url.pathname))?.[1];

                    if (!stored) {
                        res.writeHead(404).end();
                        return;
                    }
                    res.writeHead(200, { "content-length": String(stored.length) }).end();
                    return;
                }

                case "MOVE": {
                    const prefix = url.pathname.replace(/\.file$/, "");
                    const parts = [...this.chunks.entries()]
                        .filter(([name]) => name.startsWith(prefix))
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([, data]) => data);

                    this.files.set(req.headers["destination"] as string, Buffer.concat(parts));
                    res.writeHead(201).end();
                    return;
                }

                default:
                    res.writeHead(404).end();
            }
        });

        await new Promise<void>((resolve) => this.server!.listen(0, resolve));
        const { port } = this.server!.address() as { port: number };
        return `http://127.0.0.1:${port}`;
    }

    stop() {
        this.server?.close();
    }

    assembled(): Buffer | undefined {
        return [...this.files.values()][0];
    }
}

function readBody(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

let stub: StubNextcloud;
let baseURL: string;
let driver: NextCloudDriver;
let store: NextcloudTusStore;

beforeAll(async () => {
    stub = new StubNextcloud();
    baseURL = await stub.start();
    driver = new NextCloudDriver(baseURL, "admin", "admin", "video-review");
});

afterAll(() => stub.stop());

beforeEach(async () => {
    stub.chunks.clear();
    stub.files.clear();
    stub.collections.length = 0;
    store = new NextcloudTusStore(driver, new MemoryKvStore<Upload>());
    await store.create(new Upload({ id: storageKey, offset: 0, size: payload.length }));
});

describe("NextcloudTusStore", () => {
    it("assembles the chunks it sent into the original file, byte for byte", async () => {
        for (let offset = 0; offset < payload.length; offset += 100_000) {
            const chunk = payload.subarray(offset, offset + 100_000);
            await store.write(Readable.from(chunk), storageKey, offset);
        }

        expect(stub.assembled()?.equals(payload)).toBe(true);
    });

    it("does not mix chunks of an abandoned attempt into the next one", async () => {
        await store.write(Readable.from(payload.subarray(0, 100_000)), storageKey, 0);
        await store.write(Readable.from(payload.subarray(100_000, 200_000)), storageKey, 100_000);

        // A second attempt at the same key, sent in one piece. Its chunk replaces the first
        // one, but the second chunk of the abandoned attempt is named after its own offset.
        await store.create(new Upload({ id: storageKey, offset: 0, size: payload.length }));
        await store.write(Readable.from(payload), storageKey, 0);

        expect(stub.assembled()?.length).toBe(payload.length);
        expect(stub.assembled()?.equals(payload)).toBe(true);
    });

    it("reports a finished upload as complete, so a reconnecting client does not start over", async () => {
        await store.write(Readable.from(payload), storageKey, 0);

        const upload = await store.getUpload(storageKey);

        expect(upload.offset).toBe(payload.length);
        expect(upload.size).toBe(payload.length);
    });

    it("puts the file where the rest of the app looks for it, whatever the title holds", async () => {
        // A user name with a space is escaped once by the driver; a title can hold "%" and
        // characters outside ASCII. Every path has to come out the same way.
        const spaced = new NextCloudDriver(baseURL, "video review", "pw", "video-review");
        const awkward = new NextcloudTusStore(spaced, new MemoryKvStore<Upload>());
        const key = "videos/projectA/100% Final 戦闘シーン/rev_001.mp4";

        await awkward.create(new Upload({ id: key, offset: 0, size: payload.length }));
        await awkward.write(Readable.from(payload), key, 0);

        // hasObject is what upload-status and finish ask, so it has to agree with the MOVE.
        expect(await spaced.hasObject(key)).toBe(true);
        expect([...stub.files.keys()]).toContain(spaced.pathUnderRoot(key));
        expect([...stub.files.keys()][0]).not.toContain("%2520");
    });

});
