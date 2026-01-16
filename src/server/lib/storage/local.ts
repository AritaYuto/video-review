

import { UploadStorageType } from '@/lib/db-types';
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { FileStorage } from "@/server/lib/storage";
import Stream from 'stream';

import "server-only"

let localBaseDirectory: string | undefined;
export const LocalBaseDirectory = () => {
    if(!localBaseDirectory){
        if(process.env.LOCAL_ROOTDIR && fs.existsSync(process.env.LOCAL_ROOTDIR)) {
            localBaseDirectory = process.env.LOCAL_ROOTDIR
        } else {
            console.warn(`
                [WARN] LOCAL_ROOTDIR is not set or invalid.
                Falling back to default directory: ./uploads
                For production use, please configure LOCAL_ROOTDIR explicitly.
            `);
            localBaseDirectory = path.join(process.cwd(), "uploads") 
        }
    }
    return localBaseDirectory;
}

export class LocalStorage implements FileStorage {

    type(): string {
        return UploadStorageType.local;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        const abs = path.join(LocalBaseDirectory(), storageKey);
        return fs.existsSync(abs);
    }

    async directUploadFromBuffer(storageKey: string, src: Stream.Readable, contentType: string): Promise<void> {
        const fullPath = path.join(process.cwd(), storageKey);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, src);
    }

    async directUploadFromFile(storageKey: string, src: string): Promise<void> {
        const fullPath = path.join(process.cwd(), storageKey);
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
        console.log("[deleteObject] called");
        console.log("[deleteObject] storageKey =", storageKey);

        const abs = this.resolveStoragePath(storageKey);
        console.log("[deleteObject] resolved abs path =", abs);

        if (!abs) {
            console.warn("[deleteObject] resolveStoragePath returned null/undefined");
            return false;
        }

        const existsBefore = fs.existsSync(abs);
        console.log("[deleteObject] exists before delete =", existsBefore);

        if (!existsBefore) {
            console.warn("[deleteObject] file does not exist:", abs);
            return false;
        }

        try {
            console.log("[deleteObject] fs.rmSync start");

            fs.rmSync(abs, {
                recursive: true,
                force: true,
            });

            console.log("[deleteObject] fs.rmSync done");

            const existsAfter = fs.existsSync(abs);
            console.log("[deleteObject] exists after delete =", existsAfter);

            if (existsAfter) {
                console.error("[deleteObject] delete attempted but file still exists:", abs);
            }

            return !existsAfter;
        } catch (err) {
            console.error("[deleteObject] exception while deleting:", abs);
            console.error(err);
            return false;
        }
    }

    /**
     * Resolves a storageKey into an absolute filesystem path under the uploads directory.
     *
     * This function exists for two reasons:
     * 1. Backward compatibility:
     *    In early versions, some records were persisted with API-facing paths
     *    (e.g. "/api/uploads/...") instead of pure storage-relative keys.
     *    To keep those legacy records working, we strip the "/api/uploads/" prefix
     *    only when it appears at the beginning of the key.
     *
     * 2. Safety:
     *    The resolved path is strictly constrained to stay inside the uploads
     *    base directory to prevent path traversal or accidental deletion of
     *    files outside the storage root.
     *
     * Behavior:
     * - Removes a leading "/api/uploads/" prefix if present (legacy compatibility).
     * - Removes any remaining leading slashes to avoid absolute path resolution.
     * - Resolves the path relative to "<localBaseDirectory>".
     * - Returns undefined if the resolved path escapes the uploads directory.
     */
    resolveStoragePath(storageKey: string): string | undefined {
        let key = storageKey;
        if (key.startsWith("/api/uploads/")) {
            key = key.slice("/api/uploads/".length);
        }

        key = key.replace(/^[/\\]+/, "");
        const baseDir = path.join(LocalBaseDirectory());
        const resolved = path.resolve(baseDir, key);

        if (!resolved.startsWith(baseDir + path.sep)) {
            return undefined;
        }
        return resolved;
    }
}
