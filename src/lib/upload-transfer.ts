import { useAuthStore } from "@/stores/auth-store";
import { UploadSession, UploadStorageType } from "@/lib/db-types";

// Carries the HTTP status so the caller can tell a rejected size (413) from other failures.
export class UploadTransferError extends Error {
    readonly status: number;

    constructor(status: number) {
        super(`upload transfer failed with status ${status}`);
        this.name = "UploadTransferError";
        this.status = status;
    }
}

// Sends the bytes to the URL issued by an upload session. Local and Nextcloud storage go
// through the app's own transfer route (multipart, bearer token); S3 is a presigned PUT.
export async function uploadToSession(data: { url: string; session: UploadSession; file: Blob }): Promise<void> {
    if (data.session.storage === UploadStorageType.s3) {
        const res = await fetch(data.url, {
            method: "PUT",
            body: data.file,
            headers: { "Content-Type": data.file.type },
        });
        if (!res.ok) throw new UploadTransferError(res.status);
        return;
    }

    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("file", data.file);
    const res = await fetch(data.url, {
        method: "PUT",
        body: form,
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new UploadTransferError(res.status);
}
