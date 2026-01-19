import { ApiError, ApiResult } from "@/lib/utils/api-result";
import { useAuthStore } from "@/stores/auth-store";

export async function bootstrap(email: string, pass: string): Promise<ApiResult<void>> {
    const res = await fetch(`/api/v1/admin/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pass }),
    });

    if(res.ok) {
        return { ok: true, data: undefined }
    }

    return ApiError(res);
}

export async function apiTokenRotate(): Promise<ApiResult<string>> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/v1/admin/maintenance/api-token/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });

    if(res.ok) {
        const data = await res.json();
        return { ok: true, data: data.token }
    }

    return ApiError(res);
}

