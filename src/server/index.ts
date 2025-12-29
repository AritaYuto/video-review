import { Hono } from "hono";
import { mediaRouter } from "@/routes/media";
import { readStatusRouter } from "@/routes/read-status";
import { localRouter } from "@/routes/media/local";
import { nextCloudRouter } from "@/routes/media/nextcloud";
import { resolverRouter } from "@/routes/media/resolver";

export const app = new Hono().basePath("/api");

// v1 API
app.route("/v1/media", mediaRouter);
app.route("/v1/read-status", readStatusRouter);

// 旧API
app.route("/uploads", localRouter);
app.route("/read-status", readStatusRouter);
app.route("/media", resolverRouter);
app.route("/nextcloud/media", nextCloudRouter);

console.log('Hono server is set up for Next.js API routes.', app);