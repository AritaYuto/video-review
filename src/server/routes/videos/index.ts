import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { uploadRouter } from "@/server/routes/videos/upload";
import { foldersRouter } from "@/server/routes/videos/folders";
import { listRouter } from "@/server/routes/videos/list";
import { videoByIdRouter } from "@/server/routes/videos/[id]";

export const videosRouter = new Hono()
    .route('/', listRouter)
    .route('/upload', uploadRouter)
    .route('/folders', foldersRouter)
    .route("/:id", videoByIdRouter);
