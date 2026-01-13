import { useAuthStore } from "@/stores/auth-store";

export async function uploadAvatar(data: {
    email: string,
    file: File;
}): Promise<boolean> {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("file", data.file);

    const res = await fetch("/api/v1/avatar/upload", {
        method: "put",
        body: formData,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) throw new Error("Failed to upload avatar icon");
    const json = await res.json();
    return json.ok;
}

export async function fetchLocal(email: string): Promise<string | undefined> {
    const res = await fetch(`/api/v1/avatar/local?email=${encodeURIComponent(email)}`);
    if (!res.ok) return undefined;

    const json = await res.json();
    return json?.avatarUrl;
}

export async function fetchIntegration(email: string): Promise<string | undefined> {
    const res = await fetch(`/api//v1/avatar/integration?email=${encodeURIComponent(email)}`);
    if (!res.ok) return undefined;

    const blob = await res.blob();
    if (blob.size === 0) return undefined;

    return URL.createObjectURL(blob);
}