import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { postRouter } from "@/routes/integrations/slack/post";

export const slackRouter = new Hono();

slackRouter.route("/post", postRouter);
