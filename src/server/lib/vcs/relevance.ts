import type { Relevance } from "./types";

const PR_FILES_LIMIT = 50;

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
 * Score the relevance of a PR against this video.
 *
 * Strategy:
 *   A (file path match, requires fetchFiles):
 *     - Try A for all PRs up to PR_FILES_LIMIT when vcsWatchPaths is set
 *     - A match → "high"
 *   B (title keyword match):
 *     - Applied to PRs that A didn't match, and always for commits
 *     - B match → "maybe"
 *   Neither → "unlikely" (only when vcsWatchPaths is set; otherwise "high")
 */
export async function scorePRRelevance(
    prTitle: string,
    prIndex: number,
    vcsWatchPaths: string[],
    titleKeywords: string[],
    fetchFiles: (() => Promise<string[]>) | undefined,
): Promise<RelevanceResult> {
    if (vcsWatchPaths.length === 0) {
        return { relevance: "high", relevanceReason: "no filter configured" };
    }

    // Approach A: file path match (up to PR_FILES_LIMIT PRs)
    if (fetchFiles && prIndex < PR_FILES_LIMIT) {
        const files = await fetchFiles();
        const matched = files.find(f => matchesWatchPaths(f, vcsWatchPaths));
        if (matched) {
            return { relevance: "high", relevanceReason: `vcsWatchPaths match: ${matched}` };
        }
    }

    // Approach B: title keyword match
    if (titleKeywords.length > 0 && matchesKeywords(prTitle, titleKeywords)) {
        return { relevance: "maybe", relevanceReason: "title keyword match" };
    }

    return { relevance: "unlikely", relevanceReason: "no vcsWatchPaths or keyword match" };
}

export function scoreCommitRelevance(
    commitMessage: string,
    vcsWatchPaths: string[],
    titleKeywords: string[],
): RelevanceResult {
    if (vcsWatchPaths.length === 0) {
        return { relevance: "high", relevanceReason: "no filter configured" };
    }

    // Commits: only Approach B (fetching per-commit file lists is too costly)
    if (titleKeywords.length > 0 && matchesKeywords(commitMessage, titleKeywords)) {
        return { relevance: "maybe", relevanceReason: "title keyword match" };
    }

    return { relevance: "unlikely", relevanceReason: "no keyword match" };
}
