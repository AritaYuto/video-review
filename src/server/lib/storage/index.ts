import { NextResponse } from "next/server";
import { LocalStorage } from "@/server/lib/storage/local";
import { NextCloudStorage } from "@/server/lib/storage/nextcloud";
import { S3Storage } from "@/server/lib/storage/s3";
import { Readable } from "stream";

import "server-only"

export interface FileStorage {
    type(): string;
    directUploadFromBuffer(storageKey: string, src: Readable, contentType: string): Promise<void>;
    directUploadFromFile(storageKey: string, src: string): Promise<void>;
    uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string>;
    fallbackURL(storageKey: string): Promise<string>;
    download(storageKey: string): Promise<NextResponse>;
    hasObject(storageKey: string): Promise<boolean>;
    deleteObject(storageKey: string): Promise<boolean>;
}

export const VideoReviewStorage: FileStorage = (() => {
    switch (process.env.VIDEO_REVIEW_STORAGE) {
        case "s3":
            return new S3Storage();
        case "nextCloud":
            return new NextCloudStorage();
        default:
            return new LocalStorage(process.cwd());
    }
})();
