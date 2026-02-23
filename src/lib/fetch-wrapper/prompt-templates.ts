import { useAuthStore } from "@/stores/auth-store";
import { ApiError, ApiResult } from "@/lib/utils/api-result";
import { PromptTemplate } from "@/lib/db-types";

export async function getPromptKinds(): Promise<ApiResult<string[]>> {
    const res = await fetch(`/api/v1/videos/event-kinds`, { method: "GET" });
    if (res.ok) {
        const json = await res.json();
        return { ok: true, data: json.items ?? [] };
    }
    return ApiError(res);
}


export async function getPromptKeys(): Promise<ApiResult<string[]>> {
    const res = await fetch(`/api/v1/prompt-templates/keys`, { method: "GET" });
    if (res.ok) {
        const json = await res.json();
        return { ok: true, data: json.items ?? [] };
    }
    return ApiError(res);
}


export async function getPrompts(key?: string): Promise<ApiResult<PromptTemplate[]>> {
    const params = new URLSearchParams();
    if (key) params.set("key", key);

    const res = await fetch(`/api/v1/prompt-templates?${params.toString()}`, {
        method: "GET",
    });
    if (res.ok) {
        const json = await res.json();
        return { ok: true, data: json.items ?? [] };
    }
    return ApiError(res);
}


export async function updatePrompt(data: {
    key: string,
    kinds: string[],
    prompt: string
}): Promise<ApiResult<PromptTemplate>> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/v1/prompt-templates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        return { ok: true, data: await res.json() };
    }
    return ApiError(res);
}

