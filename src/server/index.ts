import { Hono } from "hono";
import { mediaRouter } from "@/routes/media";
import { readStatusRouter } from "@/routes/read-status";

export const app = new Hono().basePath("/api");

// v1 API
app.route("/v1/media", mediaRouter);
app.route("/v1/read-status", readStatusRouter);

// 旧API
app.route("/uploads", mediaRouter);
app.route("/read-status", readStatusRouter);

console.log('Hono server is set up for Next.js API routes.', app);