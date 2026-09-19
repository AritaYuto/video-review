import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { unreadRouter } from "@/server/routes/read-status/unread";
import { latestRouter } from "@/server/routes/read-status/latest";
import { updateStatusRouter } from "@/server/routes/read-status/update-status";

export const readStatusRouter = new Hono()
    .route("", updateStatusRouter)
    .route("/unread", unreadRouter)
    .route("/latest", latestRouter);
