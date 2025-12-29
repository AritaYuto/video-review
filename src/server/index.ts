import { Hono } from "hono";
import { mediaRouter } from "@/routes/media";
import { readStatusRouter } from "@/routes/read-status";
import { localRouter } from "@/routes/media/local";
import { nextCloudRouter } from "@/routes/media/nextcloud";
import { resolverRouter } from "@/routes/media/resolver";
import { commentsRouter } from "@/routes/comments";
import { authRouter } from "@/routes/auth";
import { adminRouter } from "@/routes/admin";
import { integrationsRouter } from "@/routes/integrations";
import { slackRouter } from "@/routes/integrations/slack";
import { jiraRouter } from "@/routes/integrations/jira";

export const app = new Hono().basePath("/api");

// v1 API
app.route("/v1/media", mediaRouter);
app.route("/v1/read-status", readStatusRouter);
app.route("/v1/comments", commentsRouter);
app.route("/v1/auth", authRouter);
app.route("/v1/admin", adminRouter);
app.route("/v1/integrations", integrationsRouter);


// 旧API
app.route("/uploads", localRouter);
app.route("/read-status", readStatusRouter);
app.route("/media", resolverRouter);
app.route("/nextcloud/media", nextCloudRouter);
app.route("/comments", commentsRouter);
app.route("/auth", authRouter);
app.route("/admin", adminRouter);
app.route("/slack", slackRouter);
app.route("/jira", jiraRouter);

console.log('Hono server is set up for Next.js API routes.', app);