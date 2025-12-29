import { Hono } from "hono";
import { uploadRouter } from "@/routes/drawing/upload";

export const drawingRouter = new Hono();

drawingRouter.route('/upload', uploadRouter);