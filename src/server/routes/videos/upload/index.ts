import { Hono } from "hono";
import { initRouter } from "@/routes/videos/upload/init";
import { finishRouter } from "@/routes/videos/upload/finish";
import { transferRouter } from "@/routes/videos/upload/transfer";

export const uploadRouter = new Hono();

uploadRouter.route('/init', initRouter);
uploadRouter.route('/finish', finishRouter);
uploadRouter.route('/transfer', transferRouter);
