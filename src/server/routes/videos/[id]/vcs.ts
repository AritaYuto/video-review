import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { createVCSProviderFromEnv } from "@/server/lib/vcs/from-env";
import { ChangeSet, PullRequest } from "@/server/lib/vcs/types";
import { extractKeywords, scorePRRelevance, scoreCommitRelevance } from "@/server/lib/vcs/relevance";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";

export const vcsRouter = new Hono();

const QuerySchema = z.object({
    from: z.string().optional(),   // videoRevisionId of the previous revision
    vcsConfigId: z.string().optional(),
    refresh: z.string().transform(v => v === "true").optional(),
});

vcsRouter.openapi({
    method: "get",
    summary: "Get VCS changes between video revisions",
    description: "Returns pull requests and commits between two video revision upload timestamps, with relevance scoring based on the video's vcsWatchPaths and title.",
    path: "/vcs-changes",
    request: { query: QuerySchema },
    responses: {
        200: { description: "VCS changes retrieved successfully" },
        404: { description: "Video revision not found" },
        503: { description: "VCS provider not configured" },
    },
}, async (c) => {
    const videoId = c.req.param("id");
    const { from: fromRevisionId, refresh } = c.req.valid("query");

    // Fetch the video (for vcsWatchPaths + title used in relevance scoring)
    const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { title: true, vcsWatchPaths: true },
    });
    if (!video) {
        return c.json({ error: "Video revision not found" }, { status: 404 });
    }

    // Resolve the "to" revision (latest revision of this video)
    const toRevision = await prisma.videoRevision.findFirst({
        where: { videoId, deleted: false },
        orderBy: { revision: "desc" },
    });
    if (!toRevision) {
        return c.json({ error: "Video revision not found" }, { status: 404 });
    }

    // Resolve the "from" revision
    let fromRevision: { uploadedAt: Date } | null = null;
    if (fromRevisionId) {
        fromRevision = await prisma.videoRevision.findUnique({
            where: { id: fromRevisionId },
            select: { uploadedAt: true },
        });
    } else {
        fromRevision = await prisma.videoRevision.findFirst({
            where: { videoId, deleted: false, revision: { lt: toRevision.revision } },
            orderBy: { revision: "desc" },
            select: { uploadedAt: true },
        });
    }

    // Check cache
    const existingLink = await prisma.vCSRevisionLink.findFirst({
        where: { videoRevisionId: toRevision.id },
        orderBy: { fetchedAt: "desc" },
    });

    if (existingLink?.changeSet && !refresh) {
        return c.json({
            ...(existingLink.changeSet as object),
            fromCache: true,
            fetchedAt: existingLink.fetchedAt,
        });
    }

    // Build provider
    let provider;
    try {
        provider = createVCSProviderFromEnv();
    } catch (err) {
        return c.json({ error: String(err) }, { status: 503 });
    }
    if (!provider) {
        return c.json({ error: "VCS provider is not configured" }, { status: 503 });
    }

    // Fetch raw changes
    let changeSet: ChangeSet;
    try {
        changeSet = await provider.getChanges({
            from: fromRevision?.uploadedAt,
            to: toRevision.uploadedAt,
        });
    } catch (err) {
        return c.json({ error: `Failed to fetch VCS changes: ${String(err)}` }, { status: 502 });
    }

    // Apply relevance scoring (Approach A + B)
    const vcsWatchPaths = video.vcsWatchPaths;
    const titleKeywords = extractKeywords(video.title);

    const scoredPRs = await Promise.all(
        changeSet.pullRequests.map((pr, index) =>
            scorePRRelevance(
                pr.title,
                index,
                vcsWatchPaths,
                titleKeywords,
                provider.fetchPRFiles ? () => provider.fetchPRFiles!(pr.id) : undefined,
            ).then(({ relevance, relevanceReason }) => ({ ...pr, relevance, relevanceReason }))
        )
    );

    const scoredCommits = await Promise.all(
        changeSet.commits.map((commit, index) =>
            scoreCommitRelevance(
                commit.message,
                index,
                vcsWatchPaths,
                titleKeywords,
                provider.fetchCommitFiles ? () => provider.fetchCommitFiles!(commit.hash) : undefined,
            ).then(({ relevance, relevanceReason }) => ({ ...commit, relevance, relevanceReason }))
        )
    );

    const scored: ChangeSet = {
        ...changeSet,
        pullRequests: scoredPRs,
        commits: scoredCommits,
    };

    // Upsert cache
    let vcsConfig = await prisma.vCSConfig.findFirst();
    if (!vcsConfig) {
        vcsConfig = await prisma.vCSConfig.create({
            data: {
                label: provider.name,
                provider: "github",
                config: {},
                branch: "main",
            },
        });
    }

    await prisma.vCSRevisionLink.upsert({
        where: { videoRevisionId_vcsConfigId: { videoRevisionId: toRevision.id, vcsConfigId: vcsConfig.id } },
        create: {
            videoRevisionId: toRevision.id,
            vcsConfigId: vcsConfig.id,
            changeSet: scored as object,
            fetchedAt: new Date(),
        },
        update: {
            changeSet: scored as object,
            fetchedAt: new Date(),
        },
    });

    return c.json({ ...scored, fromCache: false, fetchedAt: new Date() });
});

function buildPrompt(prs: PullRequest[], languageHint: string): string {
    const prLines = prs
        .map((pr) => {
            const labels = pr.labels.length > 0 ? ` [${pr.labels.join(", ")}]` : "";
            const desc = pr.description ? `\n  ${pr.description.slice(0, 200)}` : "";
            return `- #${pr.id}: ${pr.title}${labels} (@${pr.author})${desc}`;
        })
        .join("\n");

    return `The following pull requests were merged between two video review revisions.
Summarize them in 1-2 sentences, focusing on what may affect the video content being reviewed.
Match the language of the PR content. Language hint from the reviewer's browser: ${languageHint}.

Pull requests:
${prLines}

Respond with only the summary text. No markdown, no explanation.`;
}

vcsRouter.openapi({
    method: "get",
    summary: "Get AI summary of VCS changes for a video revision",
    path: "/vcs-summary",
    responses: {
        200: { description: "Summary returned" },
        404: { description: "No cached VCS changes found" },
        503: { description: "LLM not configured" },
    },
}, async (c) => {
    const videoId = c.req.param("id");

    const llmClient = createLLMClient();
    if (!llmClient) {
        return c.json({ error: "LLM is not configured" }, { status: 503 });
    }

    const toRevision = await prisma.videoRevision.findFirst({
        where: { videoId, deleted: false },
        orderBy: { revision: "desc" },
    });
    if (!toRevision) {
        return c.json({ error: "Video revision not found" }, { status: 404 });
    }

    const link = await prisma.vCSRevisionLink.findFirst({
        where: { videoRevisionId: toRevision.id },
        orderBy: { fetchedAt: "desc" },
    });
    if (!link?.changeSet) {
        return c.json({ error: "No cached VCS changes. Fetch vcs-changes first." }, { status: 404 });
    }

    if (link.summary) {
        return c.json({ summary: link.summary, fromCache: true });
    }

    const changeSet = link.changeSet as unknown as ChangeSet;
    const relevantPRs = changeSet.pullRequests.filter(
        (pr) => pr.relevance === "high" || pr.relevance === "maybe",
    );

    if (relevantPRs.length === 0) {
        return c.json({ summary: null, fromCache: false });
    }

    const languageHint = c.req.header("accept-language")?.split(",")[0] ?? "en";
    const prompt = buildPrompt(relevantPRs, languageHint);

    let summary: string;
    try {
        summary = await llmClient.complete(prompt);
    } catch (err) {
        return c.json({ error: `LLM error: ${String(err)}` }, { status: 502 });
    }

    await prisma.vCSRevisionLink.update({
        where: { id: link.id },
        data: { summary },
    });

    return c.json({ summary, fromCache: false });
});
