"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useVideoStore } from "@/stores/video-store";
import { useVcsChangesStore } from "@/stores/vcs-changes-store";
import { PrCard } from "@/components/video-side-panel/panels/vcs-changes-panel/pr-card";
import { CommitCard } from "@/components/video-side-panel/panels/vcs-changes-panel/commit-card";
import type { VcsPullRequest, VcsCommit } from "@/lib/vcs-types";

function diffDays(from: Date | null, to: Date): number {
    if (!from) return 0;
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function SectionHeader({ label, high, maybe }: { label: string; high: number; maybe: number }) {
    return (
        <div className="text-xs text-[#666] pt-3 pb-1 flex items-center gap-1">
            <span className="font-semibold text-[#888]">{label}</span>
            <span>（high: {high} / maybe: {maybe}）</span>
        </div>
    );
}

function partition<T extends { relevance: string }>(items: T[]) {
    return {
        high: items.filter((x) => x.relevance === "high"),
        maybe: items.filter((x) => x.relevance === "maybe"),
        unlikely: items.filter((x) => x.relevance === "unlikely"),
    };
}

export default function VcsChangesContent(props: {
    topAreaRef: RefObject<HTMLDivElement | null>;
}) {
    void props.topAreaRef;
    const t = useTranslations("vcs-changes-panel");
    const { selectedVideo, revisions, selectedRevision } = useVideoStore();
    const { data, loading, error, fetchChanges, clear } = useVcsChangesStore();
    const [showUnlikely, setShowUnlikely] = useState(false);

    const prevRevision = useMemo(() => {
        if (!selectedRevision) return null;
        return (
            revisions
                .filter((r) => r.revision < selectedRevision.revision && !r.deleted)
                .sort((a, b) => b.revision - a.revision)[0] ?? null
        );
    }, [revisions, selectedRevision]);

    useEffect(() => {
        if (!selectedVideo) {
            clear();
            return;
        }
        void fetchChanges(selectedVideo.id, prevRevision);
    }, [selectedVideo?.id, prevRevision?.id]);

    const prs = useMemo<ReturnType<typeof partition<VcsPullRequest>>>(
        () => partition(data?.pullRequests ?? []),
        [data],
    );

    const unlikelyCount = prs.unlikely.length;

    /*
     * When vcsWatchPaths is empty, all items score "high" by design.
     * In that case the unlikely toggle is not meaningful, so we hide it.
     */
    const allHigh =
        data != null &&
        prs.maybe.length === 0 &&
        prs.unlikely.length === 0;

    const toDate = data?.range.to ? new Date(data.range.to) : (selectedRevision?.uploadedAt ?? null);
    const fromDate = data?.range.from ? new Date(data.range.from) : null;
    const days = toDate ? diffDays(fromDate, toDate) : null;

    return (
        <div
            style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
            className="font-sans text-white bg-[#181818] border-[#333] w-full h-full flex flex-col border-r overflow-y-auto"
        >
            <div className="px-3 pt-3 pb-2 border-b border-[#333]">
                {selectedRevision && prevRevision && (
                    <div className="text-xs text-[#888] mb-1">
                        rev {prevRevision.revision} → rev {selectedRevision.revision}
                        {days != null && days > 0 && <span className="ml-1">（{days}{t("unit-days")}）</span>}
                    </div>
                )}
                {data && (
                    <div className="text-xs text-[#666]">
                        PR {data.pullRequests.length}{t("unit-items")} / {t("commits")} {data.commits.length}{t("unit-items")}
                    </div>
                )}
                {!loading && !data && !error && (
                    <div className="text-xs text-[#555]">{t("no-revision")}</div>
                )}
            </div>

            <div className="flex-1 px-3 pb-4">
                {loading && (
                    <div className="text-xs text-[#666] pt-4">{t("loading")}</div>
                )}

                {error && (
                    <div className="text-xs text-[#888] pt-4">
                        {error.includes("not configured") ? t("not-configured") : `${t("error")}: ${error}`}
                    </div>
                )}

                {!loading && !error && data && (
                    <>
                        {(prs.high.length > 0 || prs.maybe.length > 0 || (showUnlikely && prs.unlikely.length > 0)) && (
                            <div>
                                <SectionHeader label={t("section-prs")} high={prs.high.length} maybe={prs.maybe.length} />
                                <div className="flex flex-col gap-2">
                                    {[...prs.high, ...prs.maybe].map((pr) => (
                                        <PrCard key={pr.id} pr={pr} />
                                    ))}
                                    {showUnlikely && prs.unlikely.map((pr) => (
                                        <PrCard key={pr.id} pr={pr} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {data.pullRequests.length === 0 && data.commits.length === 0 && (
                            <div className="text-xs text-[#555] pt-4">{t("empty")}</div>
                        )}

                        {unlikelyCount > 0 && !allHigh && (
                            <button
                                onClick={() => setShowUnlikely((v) => !v)}
                                className="mt-4 text-xs text-[#666] cursor-pointer hover:text-[#888]"
                            >
                                {showUnlikely
                                    ? t("hide-unlikely")
                                    : `${t("show-unlikely")} (${unlikelyCount}${t("unit-items")})`}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
