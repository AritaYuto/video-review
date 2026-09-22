import { DataStore, Upload, type KvStore } from "@tus/utils";
import path from "path";
import type stream from "stream";

import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";
import { ServerError } from "@/server/lib/server-error";

import "server-only";

/** Chunk file names have to sort in the order the pieces were sent. */
const NAME_WIDTH = 16;

/**
 * Backs tus uploads with Nextcloud's own chunked upload: the pieces go into a collection
 * under /dav/uploads and a MOVE of ".file" assembles them onto the storage key.
 *
 * Metadata cannot live beside the chunks, because MOVE would assemble it into the video as
 * well. It is kept next to the finished file instead.
 */
export class NextcloudTusStore extends DataStore {
    private readonly driver: NextCloudDriver;
    private readonly meta: KvStore<Upload>;

    constructor(driver: NextCloudDriver, meta: KvStore<Upload>) {
        super();
        this.driver = driver;
        this.meta = meta;
        this.extensions = ["creation", "creation-with-upload", "termination"];
    }

    async create(upload: Upload): Promise<Upload> {
        // Chunks of an abandoned attempt would be assembled into this one, so the collection
        // always starts empty.
        await fetch(this.uploadCollection(upload.id), {
            method: "DELETE",
            headers: this.driver.getHeaders(),
        });

        const res = await fetch(this.uploadCollection(upload.id), {
            method: "MKCOL",
            headers: this.driver.getHeaders(),
        });

        if (res.status !== 201) {
            throw new ServerError(`failed to start the upload: ${res.status}`, 502);
        }

        await this.meta.set(upload.id, upload);
        upload.storage = { type: "nextCloud", path: upload.id };
        return upload;
    }

    async write(src: stream.Readable, id: string, offset: number): Promise<number> {
        const chunk = await toBuffer(src);

        const res = await fetch(`${this.uploadCollection(id)}/${chunkName(offset)}`, {
            method: "PUT",
            headers: this.driver.getHeaders(),
            body: new Uint8Array(chunk),
        });

        if (!res.ok) {
            throw new ServerError(`failed to store the chunk: ${res.status}`, 502);
        }

        const written = offset + chunk.length;
        const upload = await this.meta.get(id);
        if (upload) {
            upload.offset = written;
            await this.meta.set(id, upload);

            if (upload.size !== undefined && written === upload.size) {
                await this.assemble(id);
            }
        }

        return written;
    }

    async getUpload(id: string): Promise<Upload> {
        const upload = await this.meta.get(id);
        if (upload) {
            return new Upload({ ...upload });
        }

        // The metadata is dropped once the file is assembled, so a client that reconnects after
        // the last chunk is told the upload is complete instead of starting over.
        const size = await this.storedSize(id);
        if (size !== undefined) {
            return new Upload({ id, offset: size, size });
        }

        throw new ServerError("upload not found", 404);
    }

    private async storedSize(storageKey: string): Promise<number | undefined> {
        const res = await fetch(this.driver.pathUnderRoot(storageKey), {
            method: "HEAD",
            headers: this.driver.getHeaders(),
        });

        if (!res.ok) {
            return undefined;
        }

        const length = res.headers.get("content-length");
        return length === null ? undefined : Number(length);
    }

    async remove(id: string): Promise<void> {
        await fetch(this.uploadCollection(id), {
            method: "DELETE",
            headers: this.driver.getHeaders(),
        });
        await this.meta.delete(id);
    }

    /** Moves the assembled upload onto its storage key and drops the metadata. */
    private async assemble(id: string): Promise<void> {
        await this.createParentDirectories(id);

        const res = await fetch(`${this.uploadCollection(id)}/.file`, {
            method: "MOVE",
            // A header value cannot carry the non-ASCII characters a video title may have, and
            // pathUnderRoot has already escaped them.
            headers: this.driver.getHeaders({ Destination: this.driver.pathUnderRoot(id) }),
        });

        if (!res.ok) {
            throw new ServerError(`failed to assemble the upload: ${res.status}`, 502);
        }

        await this.meta.delete(id);
    }

    private async createParentDirectories(storageKey: string): Promise<void> {
        const segments = path.posix.dirname(`${this.driver.rootPath}/${storageKey}`).split("/");

        for (let i = 0; i < segments.length; i++) {
            await this.driver.createDirectory(segments.slice(0, i + 1).join("/"));
        }
    }

    /**
     * A collection name cannot hold the slashes of a storage key, so the key is encoded into
     * one path segment.
     */
    private uploadCollection(id: string): string {
        const name = Buffer.from(id).toString("base64url");
        return `${this.driver.davUploadsURL}/${name}`;
    }
}

function chunkName(offset: number): string {
    return String(offset).padStart(NAME_WIDTH, "0");
}

async function toBuffer(src: stream.Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of src) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
