import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { avatarRouter } from "@/routes/integrations/jira/avatar";
import { createRouter } from "@/routes/integrations/jira/create";

export const jiraRouter = new Hono();

jiraRouter.route("/avatar", avatarRouter);
jiraRouter.route("/create", createRouter);
