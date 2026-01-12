

import { UploadStorageType } from '@/lib/db-types';
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { FileStorage } from "@/server/lib/storage";
import Stream from 'stream';

import "server-only"

export class LocalStorage implements FileStorage {
    localBaseDirectory: string;

    constructor(localBaseDirectory: string) {
        this.localBaseDirectory = localBaseDirectory;
    }

    type(): string {
        return UploadStorageType.local;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        const abs = path.join(this.localBaseDirectory, "uploads", storageKey);
        return fs.existsSync(abs);
    }

    async directUploadFromBuffer(storageKey: string, src: Stream.Readable, contentType: string): Promise<void> {
        const fullPath = path.join(process.cwd(), "uploads", storageKey);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, src);
    }

    async directUploadFromFile(storageKey: string, src: string): Promise<void> {
        const fullPath = path.join(process.cwd(), "uploads", storageKey);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.rename(src, fullPath);
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (contentType === "image/png") {
            return `/api/v1/drawing/upload/transfer?session_id=${session_id}`
        }
        // "video/mp4"
        return `/api/v1/videos/upload/transfer?session_id=${session_id}`
    }

    async fallbackURL(storageKey: string): Promise<string> {
        if (storageKey.includes("api/uploads/")) {
            return await Promise.resolve(`/${storageKey.replace("api/uploads/", "api/v1/media/local/")}`);
        } else {
            const url = `/api/v1/media/local/${storageKey}`;
            return await Promise.resolve(url);
        }
    }

    async download(storageKey: string): Promise<NextResponse> {
        const abs = this.resolveStoragePath(storageKey);
        if (!abs || !fs.existsSync(abs)) {
            return NextResponse.json({ error: "Video file is missing on server : " + abs }, { status: 500 });
        }
        const stream = fs.createReadStream(abs);
        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/octet-stream",
            },
        });
    }

    async deleteObject(storageKey: string): Promise<boolean> {
        const abs = this.resolveStoragePath(storageKey);
        if (!abs || !fs.existsSync(abs)) {
            return false;
        }

        try {
            fs.rmSync(abs);
            return !fs.existsSync(abs);
        } catch { return false; }
    }

    resolveStoragePath(storageKey: string): string | undefined {
        let key = storageKey;
        if (storageKey.includes("api/uploads/")) {
            key = storageKey.replace("api/uploads/", "");
        }
        const baseDir = path.join(this.localBaseDirectory, "uploads");
        const resolved = path.resolve(baseDir, key);

        if (!resolved.startsWith(baseDir + path.sep)) {
            return undefined;
        }
        return resolved;
    }
}
