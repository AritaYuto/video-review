import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { resolverRouter } from "@/routes/media/resolver";
import { localRouter } from "@/routes/media/local";
import { nextCloudRouter } from "@/routes/media/nextcloud";
import { downloadRouter } from "@/routes/media/download";

export const mediaRouter = new Hono();

mediaRouter.route("/resolver", resolverRouter);
mediaRouter.route("/local", localRouter);
mediaRouter.route("/nextcloud", nextCloudRouter);
mediaRouter.route("/download", downloadRouter);
