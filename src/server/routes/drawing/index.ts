import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { uploadRouter } from "@/routes/drawing/upload";

export const drawingRouter = new Hono();

drawingRouter.route('/upload', uploadRouter);