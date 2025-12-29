import { Hono } from "hono";
import { initRouter } from "@/routes/drawing/upload/init";
import { finishRouter } from "@/routes/drawing/upload/finish";
import { transferRouter } from "@/routes/drawing/upload/transfer";

export const uploadRouter = new Hono();

uploadRouter.route('/init', initRouter);
uploadRouter.route('/finish', finishRouter);
uploadRouter.route('/transfer', transferRouter);
