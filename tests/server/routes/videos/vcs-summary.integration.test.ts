/**
 * Integration test for GET /videos/:id/vcs-summary
 *
 * Requires real LLM credentials in .env.test:
 *   VIDEO_REVIEW_LLM_PROVIDER=claude
 *   VIDEO_REVIEW_LLM_API_KEY=sk-ant-...
 *
 * Run manually:
 *   npm test -- tests/server/routes/videos/vcs-summary.integration.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { videoByIdRouter } from "@/server/routes/videos/[id]";

const hasLLMCredentials = !!(
    process.env.VIDEO_REVIEW_LLM_PROVIDER &&
    (process.env.VIDEO_REVIEW_LLM_API_KEY || process.env.VIDEO_REVIEW_LLM_BASE_URL)
);

const createdVideoIds: string[] = [];
const createdRevisionIds: string[] = [];
const createdVCSConfigIds: string[] = [];
const createdLinkIds: string[] = [];
const createdCachedMergeIds: string[] = [];

const TEST_PRS = [
    {
        id: "142",
        title: "Fix camera shake in cutscene",
        description: "Stabilized camera rig during cutscene transitions to reduce motion blur artifacts.",
        author: "yamada",
        mergedAt: new Date("2026-03-15T11:20:00Z"),
        url: "https://github.com/org/repo/pull/142",
        labels: ["bug", "camera"],
        relevance: "high",
        relevanceReason: "vcsWatchPaths match: Assets/Scripts/Camera/Shake.cs",
    },
    {
        id: "138",
        title: "CutScene timing adjustment",
        description: "Adjusted fade-in/out timing for opening cutscene from 0.3s to 0.5s.",
        author: "sato",
        mergedAt: new Date("2026-03-12T09:00:00Z"),
        url: "https://github.com/org/repo/pull/138",
        labels: ["feature"],
        relevance: "maybe",
        relevanceReason: "title keyword match",
    },
    {
        id: "135",
        title: "Fix login session timeout",
        description: null,
        author: "nakamura",
        mergedAt: new Date("2026-03-11T14:00:00Z"),
        url: "https://github.com/org/repo/pull/135",
        labels: [],
        relevance: "unlikely",
        relevanceReason: "no vcsWatchPaths or keyword match",
    },
];

describe.skipIf(!hasLLMCredentials)("GET /videos/:id/vcs-summary (real LLM)", () => {
    const app = new Hono();
    app.route("/videos/:id", videoByIdRouter);

    let videoId: string;
    let rev2Id: string;

    beforeAll(async () => {
        const rev1Id = randomUUID();
        videoId = randomUUID();
        rev2Id = randomUUID();

        await prisma.video.create({
            data: { id: videoId, title: "CutScene Opening Test", folderKey: "vcs-summary-integration" },
        });
        await prisma.videoRevision.create({
            data: { id: rev1Id, videoId, revision: 1, filePath: "test/rev1.mp4", uploadedAt: new Date("2026-03-10T09:00:00Z") },
        });
        await prisma.videoRevision.create({
            data: { id: rev2Id, videoId, revision: 2, filePath: "test/rev2.mp4", uploadedAt: new Date("2026-03-20T15:00:00Z") },
        });
        await prisma.video.update({ where: { id: videoId }, data: { latestRevisionNum: 2 } });

        const config = await prisma.vCSConfig.create({
            data: { label: "integration-test", provider: "github", config: {}, branch: "main" },
        });

        const mergeResults: { cachedMergeId: string; relevance: string; relevanceReason: string }[] = [];
        for (const pr of TEST_PRS) {
            const cached = await prisma.vCSCachedMerge.upsert({
                where: { externalId_repoName: { externalId: pr.id, repoName: "github:org/repo" } },
                create: {
                    externalId: pr.id,
                    repoName: "github:org/repo",
                    title: pr.title,
                    description: pr.description,
                    author: pr.author,
                    mergedAt: pr.mergedAt,
                    url: pr.url,
                    labels: pr.labels,
                    files: [],
                    filesFetchedAt: new Date(),
                },
                update: {},
            });
            createdCachedMergeIds.push(cached.id);
            mergeResults.push({ cachedMergeId: cached.id, relevance: pr.relevance, relevanceReason: pr.relevanceReason });
        }

        const link = await prisma.vCSRevisionLink.create({
            data: {
                videoRevisionId: rev2Id,
                vcsConfigId: config.id,
                rangeFrom: new Date("2026-03-10T09:00:00Z"),
                rangeTo: new Date("2026-03-20T15:00:00Z"),
                mergeResults: mergeResults as object[],
                commitResults: [],
                fetchedAt: new Date(),
            },
        });

        createdVideoIds.push(videoId);
        createdRevisionIds.push(rev1Id, rev2Id);
        createdVCSConfigIds.push(config.id);
        createdLinkIds.push(link.id);

        console.log("\n=== Input PRs sent to LLM ===");
        for (const pr of TEST_PRS) {
            console.log(`  [${pr.relevance}] #${pr.id} "${pr.title}" — @${pr.author}`);
            if (pr.description) console.log(`           ${pr.description}`);
        }
        console.log("  (unlikely PRs are excluded from the prompt)");
        console.log("=============================\n");
    });

    afterAll(async () => {
        await prisma.vCSRevisionLink.deleteMany({ where: { videoRevisionId: { in: createdRevisionIds } } });
        await prisma.vCSConfig.deleteMany({ where: { id: { in: createdVCSConfigIds } } });
        await prisma.vCSCachedMerge.deleteMany({ where: { id: { in: createdCachedMergeIds } } });
        await prisma.video.updateMany({ where: { id: { in: createdVideoIds } }, data: { latestRevisionNum: null } });
        await prisma.videoRevision.deleteMany({ where: { id: { in: createdRevisionIds } } });
        await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
    });

    it("returns a non-empty summary matching the PR content language", async () => {
        const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary`, {
            headers: { "accept-language": "en" },
        });
        expect(res.status).toBe(200);

        const body = await res.json() as { summary: string | null; fromCache: boolean };

        console.log("=== vcs-summary result (accept-language: en) ===");
        console.log("  summary  :", body.summary);
        console.log("  fromCache:", body.fromCache);
        console.log("================================================\n");

        expect(typeof body.summary).toBe("string");
        expect((body.summary as string).length).toBeGreaterThan(10);
        expect(body.fromCache).toBe(false);
    }, 30_000);

    it("returns cached summary on second call without hitting LLM again", async () => {
        const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary`);
        expect(res.status).toBe(200);

        const body = await res.json() as { summary: string | null; fromCache: boolean };

        console.log("=== vcs-summary result (second call) ===");
        console.log("  summary  :", body.summary);
        console.log("  fromCache:", body.fromCache);
        console.log("=========================================\n");

        expect(body.fromCache).toBe(true);
        expect(typeof body.summary).toBe("string");
    }, 10_000);
});
