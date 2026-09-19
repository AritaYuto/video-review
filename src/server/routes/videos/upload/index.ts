import { createRouter } from "@/server/lib/openapi/router";
import { initRouter } from "@/server/routes/videos/upload/init";
import { finishRouter } from "@/server/routes/videos/upload/finish";
import { transferRouter } from "@/server/routes/videos/upload/transfer";

export const uploadRouter = createRouter()
    .route('/init', initRouter)
    .route('/finish', finishRouter)
    .route('/transfer', transferRouter);
