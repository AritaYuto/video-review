import { Upload, type KvStore } from "@tus/utils";
import { Readable } from "stream";

import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";

import "server-only";

const INFO_SUFFIX = ".info";

/**
 * Keeps tus upload metadata in Nextcloud, next to where the finished file will be, so an
 * interrupted upload can still be resumed after the server restarts.
 */
export class NextcloudKvStore implements KvStore<Upload> {
    private readonly driver: NextCloudDriver;

    constructor(driver: NextCloudDriver) {
        this.driver = driver;
    }

    async get(key: string): Promise<Upload | undefined> {
        const res = await fetch(this.driver.pathUnderRoot(`${key}${INFO_SUFFIX}`), {
            headers: this.driver.getHeaders(),
        });

        if (!res.ok) {
            return undefined;
        }

        try {
            return new Upload(await res.json());
        } catch {
            return undefined;
        }
    }

    async set(key: string, value: Upload): Promise<void> {
        await this.driver.directUploadFromBuffer(
            `${key}${INFO_SUFFIX}`,
            Readable.from(Buffer.from(JSON.stringify(value))),
            "application/json",
        );
    }

    async delete(key: string): Promise<void> {
        await this.driver.deleteObject(`${key}${INFO_SUFFIX}`);
    }
}
