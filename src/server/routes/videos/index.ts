import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { uploadRouter } from "@/routes/videos/upload";
import { foldersRouter } from "@/routes/videos/folders";
import { listRouter } from "@/routes/videos/list";
import { metaDataRouter } from "@/server/routes/videos/[id]/metadata";
import { videoByIdRouter } from "@/routes/videos/[id]";

export const videosRouter = new Hono();

videosRouter.route('/', listRouter);
videosRouter.route('/upload', uploadRouter);
videosRouter.route('/folders', foldersRouter);
videosRouter.route("/metadata", metaDataRouter);
videosRouter.route("/:id", videoByIdRouter);