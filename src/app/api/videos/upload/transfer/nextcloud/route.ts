export const runtime = "nodejs";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { getSession } from "@/lib/upload-session";
import { receiveMultipart } from "@/lib/receive-multipart";
import { nextCloudClient } from "@/lib/nextcloud";

export async function PUT(req: Request): Promise<Response> {
    console.log("Nextcloud upload route called");
    try {
        authorize(req, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    console.log("Authorization successful");

    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return apiError("missing session_id", 400);
    }

    const session = await getSession(session_id);
    if (!session) {
        return apiError("missing session", 400);
    }

    return receiveMultipart(req, async (tmpFilePath) => {
        await nextCloudClient!.put(
            session.storageKey,
            fs.createReadStream(tmpFilePath)
        );
        await fs.promises.rm(tmpFilePath);
    });
}