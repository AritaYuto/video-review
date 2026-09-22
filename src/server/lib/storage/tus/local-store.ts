import { DataStore, Upload, type KvStore } from "@tus/utils";
import fs from "fs";
import path from "path";
import type stream from "stream";
import streamP from "stream/promises";

import { LocalDriver } from "@/server/lib/storage/drivers/local";
import { ServerError } from "@/server/lib/server-error";

import "server-only";

const PART_SUFFIX = ".part";

/**
 * Backs tus uploads with the local storage driver, so chunked uploads land under the same
 * storage key as every other file instead of a layout of the tus package's own.
 *
 * The upload id is the storage key. Chunks are appended to "<storageKey>.part" and renamed
 * onto the key once the upload is complete, which keeps "the object exists" meaning "the
 * upload finished" for the rest of the app.
 */
export class LocalTusStore extends DataStore {
    private readonly driver: LocalDriver;
    private readonly meta: KvStore<Upload>;

    constructor(driver: LocalDriver, meta: KvStore<Upload>) {
        super();
        this.driver = driver;
        this.meta = meta;
        this.extensions = ["creation", "creation-with-upload", "termination"];
    }

    async create(upload: Upload): Promise<Upload> {
        const part = this.partPath(upload.id);

        await fs.promises.mkdir(path.dirname(part), { recursive: true });
        await fs.promises.writeFile(part, "");
        // A file left by an earlier attempt at this key would otherwise be reported as bytes
        // this upload already has.
        await fs.promises.rm(this.finalPath(upload.id), { force: true });
        await this.meta.set(upload.id, upload);

        upload.storage = { type: "local", path: part };
        return upload;
    }

    async write(src: stream.Readable, id: string, _offset: number): Promise<number> {
        const part = this.partPath(id);

        await streamP.pipeline(src, fs.createWriteStream(part, { flags: "a" }));
        const offset = (await fs.promises.stat(part)).size;

        const upload = await this.meta.get(id);
        if (upload) {
            upload.offset = offset;
            await this.meta.set(id, upload);

            if (upload.size !== undefined && offset === upload.size) {
                await fs.promises.rename(part, this.finalPath(id));
                await this.meta.delete(id);
            }
        }

        return offset;
    }

    async getUpload(id: string): Promise<Upload> {
        const upload = await this.meta.get(id);
        if (upload) {
            return new Upload({ ...upload, offset: this.receivedBytes(id) });
        }

        // The metadata is dropped once the file is in place, so a client that reconnects after
        // the last chunk is told the upload is complete instead of starting over.
        const final = this.finalPath(id);
        if (fs.existsSync(final)) {
            const size = fs.statSync(final).size;
            return new Upload({ id, offset: size, size });
        }

        throw new ServerError("upload not found", 404);
    }

    async remove(id: string): Promise<void> {
        await fs.promises.rm(this.partPath(id), { force: true });
        // A finished upload has no metadata left, and deleting what is not there throws.
        await this.meta.delete(id).catch(() => { });
    }

    /**
     * The bytes on disk are the source of truth: whatever was written is a valid prefix of the
     * upload, so a client can always resume from there.
     */
    private receivedBytes(id: string): number {
        const part = this.partPath(id);
        return fs.existsSync(part) ? fs.statSync(part).size : 0;
    }

    private finalPath(id: string): string {
        return this.resolve(id);
    }

    private partPath(id: string): string {
        return this.resolve(`${id}${PART_SUFFIX}`);
    }

    private resolve(storageKey: string): string {
        const resolved = this.driver.resolveStoragePath(storageKey);
        if (!resolved) {
            throw new ServerError("upload path is outside the storage directory", 400);
        }
        return resolved;
    }
}
