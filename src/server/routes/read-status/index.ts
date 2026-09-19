import { createRouter } from "@/server/lib/openapi/router";
import { unreadRouter } from "@/server/routes/read-status/unread";
import { latestRouter } from "@/server/routes/read-status/latest";
import { updateStatusRouter } from "@/server/routes/read-status/update-status";

export const readStatusRouter = createRouter()
    .route("", updateStatusRouter)
    .route("/unread", unreadRouter)
    .route("/latest", latestRouter);
