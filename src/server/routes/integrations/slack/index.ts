import { Hono } from "hono";
import { postRouter } from "@/routes/integrations/slack/post";

export const slackRouter = new Hono();

slackRouter.route("/post", postRouter);
