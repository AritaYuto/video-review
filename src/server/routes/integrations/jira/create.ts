import { createVideoCommentLink } from "@/lib/url";
import { env } from "@/server/lib/env";
import { prisma } from "@/server/lib/db";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const createRouter = new Hono();

createRouter.openapi({
    method: "post",
    summary: "Create Jira Issue",
    description: "Creates a new Jira issue.",
    path: "/",
    responses: {
        200: {
            description: "Issue created successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, async (c) => {
try {
        await authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, 401);
    }

    const base = env.JIRA_BASE_URL;
    const token = env.JIRA_API_TOKEN;
    const project = env.JIRA_PROJECT;
    const assigneeEmail = env.JIRA_ASSIGNEE_USER;

    if (!base || !token || !project) {
        return c.json({ error: "jira configuration is missing" }, 500);
    }

    try {
        const formData = await c.req.formData();
        const baseURL = formData.get("baseURL") as string;
        const commentId = formData.get("commentId") as string; 
        const issueType = formData.get("issueType") as string;
        const reporterEmail = formData.get("reporterEmail") as string;
        const file = formData.get("file") as File | null;

        if (!commentId) {
            return c.json({ error: "missing commentId" }, 400);
        }

        const comment = await prisma.videoComment.findUnique({
            where: { id: commentId }
        })

        if(!comment) {
            return c.json({ error: "not found comment" }, 400);
        }

        const summary = comment.comment;
        const videoReviewURL = createVideoCommentLink(baseURL!, comment.videoId, comment.id);
        const description = `Video Review LINK\n${videoReviewURL}`
        const res = await fetch(`${base}/rest/api/2/issue`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                fields: {
                    project: { key: project },
                    summary,
                    description,
                    issuetype: { name: issueType },
                    ...(assigneeEmail && { assignee: { name: assigneeEmail } }),
                    ...(reporterEmail && { reporter: { name: reporterEmail } }),
                },
            }),
        });

        if (!res.ok) {
            return c.json({ error: "failed to create jira issue" }, 500);
        }

        const data = await res.json();
        const issueKey = data.key;

        if (file) {
            const attachForm = new FormData();
            attachForm.append("file", file, file.name);

            const uploadRes = await fetch(
                `${base}/rest/api/2/issue/${issueKey}/attachments`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-Atlassian-Token": "no-check",
                    },
                    body: attachForm,
                }
            );

            if (!uploadRes.ok) {
                return c.json({ error: "failed to attach file to jira issue" }, 500);
            }
        }
        return c.json({ issueKey }, { status: 200 });
    } catch {
        return c.json({ error: "internal error" }, 500);
    }
});