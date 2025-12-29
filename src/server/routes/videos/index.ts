import { Hono } from "hono";
import { uploadRouter } from "@/routes/videos/upload";
import { foldersRouter } from "@/routes/videos/folders";
import { listRouter } from "@/routes/videos/list";
import { videoByIdRouter } from "@/routes/videos/[id]";

export const videosRouter = new Hono();

videosRouter.route('/', listRouter);
videosRouter.route('/upload', uploadRouter);
videosRouter.route('/folders', foldersRouter);
videosRouter.route("/:id", videoByIdRouter);