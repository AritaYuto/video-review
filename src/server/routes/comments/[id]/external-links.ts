import * as env from "@/lib/env";
import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const externalLinksRouter = new Hono();

externalLinksRouter.openapi({
    method: "get",
    summary: "Get external links",
    path: "/",
    responses: {
        200: {
            description: "Get external links",
        },
        404: {
            description: "Comment not found",
        },
    },
}, async (c) => {
    try {
        const id = c.req.param("id");
        console.debug("[external-links] request", { id });

        const comment = await prisma.videoComment.findUnique({
            where: { id },
        });

        if (!comment) {
            console.warn("[external-links] comment not found", { id });
            return c.json({ error: "comment not found" }, 404);
        }

        console.debug("[external-links] comment loaded", {
            id: comment.id,
            notifiedProviders: comment.notifiedProviders,
            issueId: comment.issueId,
        });

        const externalLinks: Record<string, string> = {};

        // Slack
        if (comment.notifiedProviders.includes("slack")) {
            console.debug("[external-links] slack notified");

            const slack = await prisma.slackMessage.findUnique({
                where: { videoCommentId: comment.id }
            });

            console.debug("[external-links] slackMessage", {
                found: !!slack,
            });

            if (slack) {
                const slackTeam = env.SLACK_TEAM();
                console.debug("[external-links] slackTeam", { slackTeam });

                if (slackTeam) {
                    externalLinks.slack =
                        `https://${slackTeam}.slack.com/archives/${slack.channelId}/p${slack.ts}`;
                }
            }
        }

        // Jira
        if (comment.issueId) {
            console.debug("[external-links] jira issue detected", {
                issueId: comment.issueId,
            });

            const jiraBaseURL = env.JIRA_BASE_URL();
            console.debug("[external-links] jiraBaseURL", { jiraBaseURL });

            if (jiraBaseURL) {
                externalLinks.jira =
                    `${jiraBaseURL}/browse/${comment.issueId}`;
            }
        }

        console.debug("[external-links] resolved", externalLinks);

        return c.json(externalLinks, { status: 200 });

    } catch (err) {
        console.error("[external-links] exception", err);
        return c.json({ error: "failed to fetch external links" }, 500);
    }
});