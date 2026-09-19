import { useAuthStore } from "@/stores/auth-store";
import { UploadSession, UploadStorageType } from "@/lib/db-types";

// Sends the bytes to the URL issued by an upload session. Local and Nextcloud storage go
// through the app's own transfer route (multipart, bearer token); S3 is a presigned PUT.
export async function uploadToSession(data: { url: string; session: UploadSession; file: Blob }): Promise<void> {
    if (data.session.storage === UploadStorageType.s3) {
        await fetch(data.url, {
            method: "PUT",
            body: data.file,
            headers: { "Content-Type": data.file.type },
        });
        return;
    }

    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("file", data.file);
    await fetch(data.url, {
        method: "PUT",
        body: form,
        headers: { Authorization: `Bearer ${token}` },
    });
}
