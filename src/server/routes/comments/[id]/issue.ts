import { createVideoCommentLink } from "@/lib/url";
import { prisma } from "@/server/lib/db";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { createJiraIssue } from "@/server/lib/issue-tracker/jira";
import { OpenAPIHono as Hono, createRoute } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const issueRouter = new Hono()
    .openapi(createRoute({
        method: "post",
        summary: "Create an issue from a comment",
        description: "Creates an issue in the configured tracker from the comment text and links it to the comment.",
        path: "/",
        responses: {
            200: {
                description: "Issue created and linked; returns the updated comment",
            },
            400: {
                description: "Invalid parameters",
            },
            401: {
                description: "Unauthorized",
            },
            404: {
                description: "Comment not found",
            },
            500: {
                description: "Issue tracker not configured or rejected the request",
            },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        try {
            const id = c.req.param("id");
            const formData = await c.req.formData();
            // The public origin comes from the browser: the server may sit behind a proxy and not know it.
            const baseURL = formData.get("baseURL") as string | null;
            const issueType = formData.get("issueType") as string | null;
            const reporterEmail = formData.get("reporterEmail") as string | null;
            const file = formData.get("file") as File | null;

            if (!baseURL || !issueType) {
                return c.json({ error: "missing baseURL or issueType" }, 400);
            }

            const comment = await prisma.videoComment.findUnique({ where: { id } });
            if (!comment) {
                return c.json({ error: "comment not found" }, 404);
            }

            const videoReviewURL = createVideoCommentLink(baseURL, comment.videoId, comment.id);
            const issueKey = await createJiraIssue({
                summary: comment.comment,
                description: `Video Review LINK\n${videoReviewURL}`,
                issueType,
                reporterEmail: reporterEmail ?? undefined,
                attachment: file,
            });

            const updated = await prisma.videoComment.update({
                where: { id },
                data: { issueId: issueKey, updatedAt: new Date() },
            });
            return c.json(updated, 200);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "internal error" }, 500);
        }
    });
