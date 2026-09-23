import { createRouter } from "@/server/lib/openapi/router";
import { initRouter } from "@/server/routes/videos/upload/init";
import { finishRouter } from "@/server/routes/videos/upload/finish";
import { tusRouter } from "@/server/routes/videos/upload/tus";

export const uploadRouter = createRouter()
    .route('/init', initRouter)
    .route('/finish', finishRouter)
    .route('/tus', tusRouter);
