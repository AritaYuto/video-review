import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { initRouter } from "@/server/routes/drawing/upload/init";
import { finishRouter } from "@/server/routes/drawing/upload/finish";
import { transferRouter } from "@/server/routes/drawing/upload/transfer";

export const uploadRouter = new Hono()
    .route('/init', initRouter)
    .route('/finish', finishRouter)
    .route('/transfer', transferRouter);
