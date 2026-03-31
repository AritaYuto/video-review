import { describe, expect, it, vi } from "vitest";
import {
    matchesWatchPaths,
    extractKeywords,
    matchesKeywords,
    scorePRRelevance,
    scoreCommitRelevance,
} from "@/server/lib/vcs/relevance";

// ---------------------------------------------------------------------------
// matchesWatchPaths
// ---------------------------------------------------------------------------

describe("matchesWatchPaths", () => {
    it("matches a directory prefix (trailing slash)", () => {
        expect(matchesWatchPaths("Assets/Scripts/Camera/Foo.cs", ["Assets/Scripts/Camera/"])).toBe(true);
    });

    it("does not match a sibling directory", () => {
        expect(matchesWatchPaths("Assets/Scripts/Input/Handler.cs", ["Assets/Scripts/Camera/"])).toBe(false);
    });

    it("matches an exact file path (no trailing slash)", () => {
        expect(matchesWatchPaths(
            "Assets/Scenes/CutScene_Opening.unity",
            ["Assets/Scenes/CutScene_Opening.unity"],
        )).toBe(true);
    });

    it("does not match a file under the path when no trailing slash", () => {
        expect(matchesWatchPaths(
            "Assets/Scenes/CutScene_Opening/Sub.prefab",
            ["Assets/Scenes/CutScene_Opening"],
        )).toBe(false);
    });

    it("matches the first matching entry in a list", () => {
        expect(matchesWatchPaths("Assets/Animations/Walk.anim", [
            "Assets/Scripts/Camera/",
            "Assets/Animations/",
            "Assets/Audio/",
        ])).toBe(true);
    });

    it("returns false for an empty watchPaths list", () => {
        expect(matchesWatchPaths("Assets/Anything.cs", [])).toBe(false);
    });

    it("is case-sensitive", () => {
        expect(matchesWatchPaths("assets/scripts/camera/Foo.cs", ["Assets/Scripts/Camera/"])).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// extractKeywords
// ---------------------------------------------------------------------------

describe("extractKeywords", () => {
    it("splits on spaces", () => {
        expect(extractKeywords("OP CutScene")).toEqual(["CutScene"]);  // "OP" is 2 chars → filtered
    });

    it("splits on underscores and hyphens", () => {
        expect(extractKeywords("cutscene_opening-rev2")).toEqual(["cutscene", "opening", "rev2"]);
    });

    it("filters tokens shorter than 3 characters", () => {
        expect(extractKeywords("A B C foo")).toEqual(["foo"]);
    });

    it("splits on slashes and dots", () => {
        expect(extractKeywords("Scene/Opening.v2")).toEqual(["Scene", "Opening"]);
    });
});

// ---------------------------------------------------------------------------
// matchesKeywords
// ---------------------------------------------------------------------------

describe("matchesKeywords", () => {
    it("matches case-insensitively", () => {
        expect(matchesKeywords("Fix Camera shake", ["camera"])).toBe(true);
        expect(matchesKeywords("Fix CAMERA shake", ["Camera"])).toBe(true);
    });

    it("returns false when no keyword matches", () => {
        expect(matchesKeywords("Fix login timeout", ["camera", "cutscene"])).toBe(false);
    });

    it("returns false for empty keywords list", () => {
        expect(matchesKeywords("Fix camera", [])).toBe(false);
    });

    it("matches a partial substring", () => {
        expect(matchesKeywords("CutScene_Opening adjustment", ["CutScene"])).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// scorePRRelevance
// ---------------------------------------------------------------------------

describe("scorePRRelevance", () => {
    it("returns high with 'no filter configured' when vcsWatchPaths is empty", async () => {
        const result = await scorePRRelevance("Any PR title", 0, [], ["cutscene"], undefined);
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toBe("no filter configured");
    });

    it("returns high when file list matches vcsWatchPaths (Approach A)", async () => {
        const fetchFiles = vi.fn(async () => [
            "Assets/Scripts/Camera/CinemachineHelper.cs",
            "Assets/Audio/BGM/Opening.wav",
        ]);
        const result = await scorePRRelevance(
            "Refactor internals",
            0,
            ["Assets/Scripts/Camera/"],
            [],
            fetchFiles,
        );
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toContain("vcsWatchPaths match");
        expect(result.relevanceReason).toContain("Assets/Scripts/Camera/CinemachineHelper.cs");
        expect(fetchFiles).toHaveBeenCalledOnce();
    });

    it("returns maybe when title matches keyword but files don't match (Approach B)", async () => {
        const fetchFiles = vi.fn(async () => ["Packages/Backend/Api.cs"]);
        const result = await scorePRRelevance(
            "Fix CutScene camera timing",
            0,
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            fetchFiles,
        );
        expect(result.relevance).toBe("maybe");
        expect(result.relevanceReason).toBe("title keyword match");
    });

    it("returns unlikely when neither A nor B matches", async () => {
        const fetchFiles = vi.fn(async () => ["Packages/Backend/Api.cs"]);
        const result = await scorePRRelevance(
            "Fix login session timeout",
            0,
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            fetchFiles,
        );
        expect(result.relevance).toBe("unlikely");
        expect(result.relevanceReason).toContain("no vcsWatchPaths or keyword match");
    });

    it("skips file fetch (Approach A) for PRs beyond the limit (index >= 50)", async () => {
        const fetchFiles = vi.fn(async () => ["Assets/Scripts/Camera/Foo.cs"]);
        const result = await scorePRRelevance(
            "Fix login timeout",
            50,  // at the limit
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            fetchFiles,
        );
        // File fetch not called; title doesn't match either
        expect(fetchFiles).not.toHaveBeenCalled();
        expect(result.relevance).toBe("unlikely");
    });

    it("does not call fetchFiles when it is undefined", async () => {
        const result = await scorePRRelevance(
            "Fix CutScene camera",
            0,
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            undefined,
        );
        // fetchFiles unavailable → falls through to B
        expect(result.relevance).toBe("maybe");
    });
});

// ---------------------------------------------------------------------------
// scoreCommitRelevance
// ---------------------------------------------------------------------------

describe("scoreCommitRelevance", () => {
    it("returns high with 'no filter configured' when vcsWatchPaths is empty", async () => {
        const result = await scoreCommitRelevance("Fix anything", 0, [], ["cutscene"], undefined);
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toBe("no filter configured");
    });

    it("returns high when file list matches vcsWatchPaths (Approach A)", async () => {
        const fetchFiles = vi.fn(async () => [
            "Assets/Scripts/Camera/CinemachineHelper.cs",
        ]);
        const result = await scoreCommitRelevance(
            "Refactor internals",
            0,
            ["Assets/Scripts/Camera/"],
            [],
            fetchFiles,
        );
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toContain("vcsWatchPaths match");
        expect(fetchFiles).toHaveBeenCalledOnce();
    });

    it("returns maybe when commit message matches title keywords (Approach B)", async () => {
        const fetchFiles = vi.fn(async () => ["Packages/Backend/Api.cs"]);
        const result = await scoreCommitRelevance(
            "Adjust CutScene bloom intensity",
            0,
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            fetchFiles,
        );
        expect(result.relevance).toBe("maybe");
        expect(result.relevanceReason).toBe("title keyword match");
    });

    it("returns unlikely when commit message does not match keywords", async () => {
        const fetchFiles = vi.fn(async () => ["Packages/Backend/Api.cs"]);
        const result = await scoreCommitRelevance(
            "Fix login session timeout",
            0,
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            fetchFiles,
        );
        expect(result.relevance).toBe("unlikely");
    });

    it("returns unlikely when keywords list is empty and vcsWatchPaths is set", async () => {
        const result = await scoreCommitRelevance("Fix camera shake", 0, ["Assets/Scripts/Camera/"], [], undefined);
        expect(result.relevance).toBe("unlikely");
    });

    it("skips file fetch (Approach A) for commits beyond the limit (index >= 50)", async () => {
        const fetchFiles = vi.fn(async () => ["Assets/Scripts/Camera/Foo.cs"]);
        const result = await scoreCommitRelevance(
            "Fix login timeout",
            50,
            ["Assets/Scripts/Camera/"],
            ["CutScene"],
            fetchFiles,
        );
        expect(fetchFiles).not.toHaveBeenCalled();
        expect(result.relevance).toBe("unlikely");
    });
});
