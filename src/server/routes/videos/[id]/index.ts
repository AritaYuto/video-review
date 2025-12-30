import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { getVideoRouter } from "@/routes/videos/[id]/get-video";
import { latestRouter } from "@/routes/videos/[id]/latest";
import { revisionsRouter } from "@/routes/videos/[id]/revisions";

export const videoByIdRouter = new Hono();

videoByIdRouter.route("/", getVideoRouter);
videoByIdRouter.route("/latest", latestRouter);
videoByIdRouter.route("/revisions", revisionsRouter);
