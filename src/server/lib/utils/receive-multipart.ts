import { NextResponse } from "next/server";
import Busboy from "busboy";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";

import "server-only"

export async function receiveMultipart(req: Request, onUploadProcess: (filename: string) => Promise<void>): Promise<NextResponse> {
    return new Promise<NextResponse>((resolve) => {
        const contentType = req.headers.get("content-type") || "";
        const busboy = Busboy({ headers: { "content-type": contentType } });

        let tmpFilePath: string | null = null;
        let writeStream: fs.WriteStream | null = null;
        let writeFinished: Promise<void> | null = null;

        let responded = false;
        // The caller awaits this promise, so every failure path has to resolve it.
        const fail = (err: any) => {
            if (responded) return;
            responded = true;

            console.error("[receiveMultipart] failed", err);

            // pipe() leaves the destination open when the source errors, and an unlinked file
            // with an open descriptor keeps its disk space.
            writeStream?.destroy();
            if (tmpFilePath) {
                fs.promises.unlink(tmpFilePath).catch(() => { });
            }

            resolve(NextResponse.json({ error: "Upload failed" }, { status: 500 }));
        };

        busboy.on("file", (_name, file, info) => {
            try {
                const tmpDir = path.join(os.tmpdir(), "videoreview-tmp");
                fs.mkdirSync(tmpDir, { recursive: true });

                const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                tmpFilePath = path.join(tmpDir, unique + "_" + info.filename);

                writeStream = fs.createWriteStream(tmpFilePath);

                const target = writeStream;
                file.on("error", err => fail(err));
                target.on("error", err => fail(err));

                writeFinished = new Promise((resolveWrite) => {
                    target.on("finish", resolveWrite);
                });

                try {
                    file.pipe(target);
                } catch (err) {
                    fail(err);
                }
            } catch (err) {
                fail(err);
            }
        });

        busboy.on("error", err => fail(err));

        busboy.on("finish", async () => {
            if (responded) return;

            try {
                if (writeFinished) {
                    await writeFinished;
                } else {
                    return fail("No file stream started.");
                }

                if (!tmpFilePath) return fail("tmpFilePath missing");

                await onUploadProcess(tmpFilePath);

                responded = true;
                resolve(NextResponse.json({ ok: true }));
            } catch (err) {
                fail(err);
            }
        });

        const readable = Readable.fromWeb(req.body as any);
        readable.on("error", err => fail(err));
        readable.pipe(busboy);
    });
}
