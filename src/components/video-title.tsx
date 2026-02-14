"use client";
import React from "react";
import { useVideoStore } from "@/stores/video-store";
import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { Badge } from "@/ui/badge";

export default function VideoTitle() {
    const t = useTranslations("video-title");

    const {
        selectedVideo,
        revisions,
        selectedRevision,
        selectVideoRevision,
    } = useVideoStore();
    return (
        <div className="py-1 px-2 mb-2 flex items-center justify-between">
            <div className="min-w-0">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1 px-2 text-lg font-semibold text-[#ff8800] tracking-wide">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <span className="truncate">{selectedVideo?.title ?? t("noSelection")}</span>
                    </h2>
                    {revisions.length > 1 && (
                        <select
                            className="bg-[#202020] border border-[#333] text-sm rounded px-2 py-1 text-[#eee] hover:border-[#ff8800] transition"
                            value={selectedRevision?.id ?? ""}
                            onChange={(e) => {
                                const rev = revisions.find((r) => r.id === e.target.value);
                                if (rev) selectVideoRevision(rev);
                            }}
                        >
                            {revisions.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {t("revisionOption", {
                                        revision: r.revision,
                                        date: new Date(r.uploadedAt).toLocaleDateString("ja-JP")
                                    })}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <p className="text-xs text-[#999] mt-1">
                    {selectedRevision
                        ? t("revisionInfo", {
                            revision: selectedRevision.revision,
                            uploadedAt: new Date(selectedRevision.uploadedAt)
                                .toLocaleString()
                        })
                        : t("noRevision")}
                </p>

                {selectedRevision && (
                    <div className="px-2 mt-2 space-y-1">
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] text-[#888]">
                                {t("tagsLabel")}:
                            </span>
                            {(selectedRevision.tags?.length ?? 0) > 0 ? (
                                selectedRevision.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="border-[#333] bg-[#202020] text-[#eee]"
                                        title={tag}
                                    >
                                        {tag}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-[11px] text-[#666]">
                                    {t("noTags")}
                                </span>
                            )}
                        </div>

                        <div className="text-xs text-[#ccc] leading-relaxed break-words">
                            <span className="text-[11px] text-[#888] mr-1">
                                {t("summaryLabel")}:
                            </span>
                            {selectedRevision.summary?.trim() ? (
                                <span>{selectedRevision.summary.trim()}</span>
                            ) : (
                                <span className="text-[11px] text-[#666]">
                                    {t("noSummary")}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
