import type { Relevance } from "@/server/lib/vcs/types";

const FILES_LIMIT = 50;

/**
 * Returns true if `filePath` matches any entry in `vcsWatchPaths`.
 *
 * Match rules (per design):
 *   - Entry ending with "/" → prefix match (the directory and everything below it)
 *   - Otherwise            → exact file path match
 */
export function matchesWatchPaths(filePath: string, vcsWatchPaths: string[]): boolean {
    for (const watchPath of vcsWatchPaths) {
        if (watchPath.endsWith("/")) {
            if (filePath.startsWith(watchPath)) return true;
        } else {
            if (filePath === watchPath) return true;
        }
    }
    return false;
}

/**
 * Extracts meaningful keywords from a video title.
 * Splits on common separators and keeps tokens of 3+ characters to reduce noise.
 */
export function extractKeywords(videoTitle: string): string[] {
    return videoTitle
        .split(/[\s\-_/.()\[\]]+/)
        .map(k => k.trim())
        .filter(k => k.length >= 3);
}

/**
 * Returns true if any keyword from `keywords` appears (case-insensitive) in `text`.
 */
export function matchesKeywords(text: string, keywords: string[]): boolean {
    const lower = text.toLowerCase();
    return keywords.some(k => lower.includes(k.toLowerCase()));
}

export type RelevanceResult = { relevance: Relevance; relevanceReason: string };

/**
 * Shared scoring logic for both PRs and commits.
 *
 * Strategy:
 *   A (file path match, requires fetchFiles, up to FILES_LIMIT items):
 *     - A match → "high"
 *   B (title/message keyword match):
 *     - B match → "maybe"
 *   Neither → "unlikely"
 *   vcsWatchPaths empty → "high" (no filter configured)
 */
async function scoreRelevance(
    text: string,
    index: number,
    vcsWatchPaths: string[],
    titleKeywords: string[],
    fetchFiles: (() => Promise<string[]>) | undefined,
): Promise<RelevanceResult> {
    if (vcsWatchPaths.length === 0) {
        return { relevance: "high", relevanceReason: "no filter configured" };
    }

    // Approach A: file path match (up to FILES_LIMIT items)
    if (fetchFiles && index < FILES_LIMIT) {
        const files = await fetchFiles();
        const matched = files.find(f => matchesWatchPaths(f, vcsWatchPaths));
        if (matched) {
            return { relevance: "high", relevanceReason: `vcsWatchPaths match: ${matched}` };
        }
    }

    // Approach B: keyword match
    if (titleKeywords.length > 0 && matchesKeywords(text, titleKeywords)) {
        return { relevance: "maybe", relevanceReason: "title keyword match" };
    }

    return { relevance: "unlikely", relevanceReason: "no vcsWatchPaths or keyword match" };
}

export function scorePRRelevance(
    prTitle: string,
    prIndex: number,
    vcsWatchPaths: string[],
    titleKeywords: string[],
    fetchFiles: (() => Promise<string[]>) | undefined,
): Promise<RelevanceResult> {
    return scoreRelevance(prTitle, prIndex, vcsWatchPaths, titleKeywords, fetchFiles);
}

export function scoreCommitRelevance(
    commitMessage: string,
    commitIndex: number,
    vcsWatchPaths: string[],
    titleKeywords: string[],
    fetchFiles: (() => Promise<string[]>) | undefined,
): Promise<RelevanceResult> {
    return scoreRelevance(commitMessage, commitIndex, vcsWatchPaths, titleKeywords, fetchFiles);
}
