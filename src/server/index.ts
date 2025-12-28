import { Hono } from "hono";
import { mediaRouter } from "@/routes/media";

export const app = new Hono().basePath("/api");

// v1 API
app.route("/v1/media", mediaRouter);

// 旧API
app.route("/uploads", mediaRouter);

console.log('Hono server is set up for Next.js API routes.', app)