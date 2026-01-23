import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { jiraRouter } from "@/routes/integrations/jira";


export const integrationsRouter = new Hono();

integrationsRouter.route("/jira", jiraRouter);