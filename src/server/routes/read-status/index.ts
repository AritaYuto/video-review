import { Hono } from "hono";
import { unreadRouter } from "@/routes/read-status/unread";
import { latestRouter } from "@/routes/read-status/latest";
import { updateStatusRouter } from "@/routes/read-status/update-status";

export const readStatusRouter = new Hono();

readStatusRouter.route("", updateStatusRouter);
readStatusRouter.route("/unread", unreadRouter);
readStatusRouter.route("/latest", latestRouter);
