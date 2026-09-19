import { z } from "@hono/zod-openapi";

// Every error body is { error: string }. Declaring it per status lets the RPC
// client narrow res.json() on res.status instead of guessing the shape.
export const ErrorSchema = z.object({ error: z.string() });

export const errorResponse = (description: string) => ({
    description,
    content: { "application/json": { schema: ErrorSchema } },
});
