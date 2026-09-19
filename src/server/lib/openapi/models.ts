// Side-effect import: installs .openapi() on zod schemas, which the generated module lacks.
import "@hono/zod-openapi";
import { JsonValueSchema, VideoSchema as VideoRow, VideoEventSchema as VideoEventRow } from "@/schema/zod";

// The generated JsonValueSchema is recursive (z.lazy); registering it under a name makes
// zod-to-openapi emit a $ref instead of expanding it until the stack overflows.
export const JsonValue = JsonValueSchema.openapi("JsonValue");

export const VideoSchema = VideoRow.extend({ links: JsonValue });
export const VideoEventSchema = VideoEventRow.extend({ links: JsonValue });
