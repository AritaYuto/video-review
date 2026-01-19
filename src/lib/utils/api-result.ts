export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; code: string; msg: string };

export async function ApiError<T>(res: Response): Promise<ApiResult<T>> {
    const body = await res.json();
    return {
        ok: false,
        code: body.code ?? "ERROR",
        msg: body.error ?? "Failed to bootstrap",
    };
}