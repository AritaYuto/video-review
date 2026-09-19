import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { resolverRouter } from "@/server/routes/media/resolver";
import { localRouter } from "@/server/routes/media/local";
import { nextCloudRouter } from "@/server/routes/media/nextcloud";
import { downloadRouter } from "@/server/routes/media/download";

export const mediaRouter = new Hono()
    .route("/resolver", resolverRouter)
    .route("/local", localRouter)
    .route("/nextcloud", nextCloudRouter)
    .route("/download", downloadRouter);
