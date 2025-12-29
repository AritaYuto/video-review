import { Hono } from "hono";
import { resolverRouter } from "@/routes/media/resolver";
import { localRouter } from "@/routes/media/local";
import { nextCloudRouter } from "@/routes/media/nextcloud";

export const mediaRouter = new Hono();

mediaRouter.route("/resolver", resolverRouter);
mediaRouter.route("/local", localRouter);
mediaRouter.route("/nextcloud", nextCloudRouter);
