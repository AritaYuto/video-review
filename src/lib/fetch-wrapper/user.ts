import { ApiError, ApiResult } from "@/lib/utils/api-result";
import { User } from "@prisma/client";

export async function updateUser(data: {
    userId?: string;
    email?: string;
    pass?: string;
    displayName?: string;
}): Promise<ApiResult<User>> {
    const res = await fetch(`/api/v1/user/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if(res.ok) {
        const data = await res.json();
        return { ok: true, data: data.updated }
    }

    return ApiError(res);
}

