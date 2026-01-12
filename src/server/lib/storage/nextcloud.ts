import { UploadStorageType } from'@/lib/db-types';
import { NextResponse } from "next/server";
import { FileStorage } from "@/server/lib/storage";
import { nextCloudClient } from "@/server/lib/storage/integrations/nextcloud";
import fs, { createReadStream } from "fs";
import Stream from 'stream';
import { lookup } from "mime-types";

import "server-only"

export class NextCloudStorage implements FileStorage {
    type(): string {
        return UploadStorageType.nextCloud;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        return nextCloudClient?.hasObject(storageKey) || false;
    }

    async directUploadFromBuffer(storageKey: string, src: Stream.Readable, contentType: string): Promise<void> {
        await nextCloudClient!.put(storageKey, src);
    }

    async directUploadFromFile(storageKey: string, src: string): Promise<void> {
        await this.directUploadFromBuffer(
            storageKey, 
            createReadStream(src),
            lookup(src) || "application/octet-stream");

        if (fs.existsSync(src)) {
            fs.rmSync(src);
        }
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (contentType === "image/png") {
            return `/api/v1/drawing/upload/transfer?session_id=${session_id}`
        }
        // "video/mp4"
        return `/api/v1/videos/upload/transfer?session_id=${session_id}`
    }

    async fallbackURL(storageKey: string): Promise<string> {
        return `/api/v1/media/nextcloud/${storageKey}`;
    }

    async download(storageKey: string): Promise<NextResponse> {
        return nextCloudClient!.download(storageKey);
    }

    async deleteObject(storageKey: string): Promise<boolean> {
        return nextCloudClient!.deleteObject(storageKey);
    }
}