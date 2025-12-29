import { NextResponse } from "next/server";
import { LocalStorage } from "@/server/storage/local";
import { NextCloudStorage } from "@/server/storage/nextcloud";
import { S3Storage } from "@/server/storage/s3";

import "server-only"

export interface FileStorage {
    type(): string;
    uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string>;
    fallbackURL(storageKey: string): Promise<string>;
    download(storageKey: string): Promise<NextResponse>;
    hasObject(storageKey: string): Promise<boolean>;
}

export const VideoReviewStorage: FileStorage = (() => {
    switch (process.env.VIDEO_REVIEW_STORAGE) {
        case "s3":
            return new S3Storage();
        case "nextCloud":
            return new NextCloudStorage();
        default:
            return new LocalStorage();
    }
})();
