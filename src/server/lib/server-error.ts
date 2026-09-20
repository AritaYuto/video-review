import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ServerError extends Error {
    status: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.status = statusCode;
        this.message = message;
    }
}

// Expose expected client errors, but hide internal details from 5xx responses.
export const handleServerError = (err: Error, c: Context) => {
    if (err instanceof ServerError && err.status < 500) {
        return c.json({ error: err.message }, err.status as ContentfulStatusCode);
    }
    const status = err instanceof ServerError ? (err.status as ContentfulStatusCode) : 500;
    return c.json({ error: "internal error" }, status);
};
