import { hash } from "crypto";
import { UploadSession } from "@/lib/db-types";
import os from "os";
import path from "path";
import { VideoReviewStorage } from "@/server/lib/storage";
import { spawn } from "child_process";


function execFFmpeg({
    input,
    output,
    seek = 1,
    width = 320,
}: {
    input: string;
    output: string;
    seek?: number;
    width?: number;
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const args = [
            "-y",
            "-ss", String(seek),
            "-i", input,
            "-frames:v", "1",
            "-vf", `scale=${width}:-1`,
            output,
        ];

        const proc = spawn("ffmpeg", args, {
            stdio: ["ignore", "ignore", "pipe"],
        });

        let stderr = "";
        proc.stderr.on("data", (data) => (stderr += data.toString()));

        proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg failed: ${stderr}`));
        });

        proc.on("error", reject);
    });
}

export async function generateThumbnail(videoId: string, tempMoviePath: string): Promise<void> {
    const storageKey = path.join(
        "thumbnails",
        videoId,
        "thumb.png"
    ).replace(/\\/g, "/");

    try {
        const tmpPngPath = path.join(os.tmpdir(), "thumb_" + crypto.randomUUID() + ".png");;

        await execFFmpeg({
            input: tempMoviePath,
            output: tmpPngPath,
            seek: 1,
            width: 320
        });

        await VideoReviewStorage.directUploadFromFile(storageKey, tmpPngPath);
    } catch (e) {
        console.warn("failed to generate thumbnail", e);
    }
}