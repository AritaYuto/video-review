import { Hono } from "hono";

import { tusServer } from "@/server/lib/storage/tus/server";

/**
 * Chunked, resumable uploads, handled by @tus/server. It speaks the tus protocol over the
 * same Request/Response as Hono, so the API stays on one router.
 *
 * Authorisation happens in the tus server's hooks, which call the same authorize() every
 * other route uses.
 */
export const tusRouter = new Hono()
    .all("/", (c) => tusServer().handleWeb(c.req.raw))
    .all("/:id{.*}", (c) => tusServer().handleWeb(c.req.raw));
