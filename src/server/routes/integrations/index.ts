import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { slackRouter } from "@/routes/integrations/slack";
import { jiraRouter } from "@/routes/integrations/jira";


export const integrationsRouter = new Hono();

integrationsRouter.route("/slack", slackRouter);
integrationsRouter.route("/jira", jiraRouter);