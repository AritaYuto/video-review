"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Video } from "@/lib/db-types";
import { useSidebar } from "@/ui/sidebar";
import VideoThumbnails from "@/components/video-browser/video-thumbnails";

type Props = {
    open: boolean;
    videos: Video[];
    unReadVideoIds: string[];
    selectedVideoId: string | undefined;
    onSelectVideo: (videoId: string) => void;
    onClose: () => void;
};

export default function VideoThumbnailsPanel({
    open,
    videos,
    unReadVideoIds,
    selectedVideoId,
    onSelectVideo,
    onClose,
}: Props) {
    const panelRef = useRef<HTMLDivElement>(null);
    const { state, isMobile } = useSidebar();
    // The sidebar keeps its width variable while collapsed off-canvas, so the
    // offset has to come from its open state rather than from the variable.
    const offset = isMobile || state === "collapsed" ? "0px" : "var(--sidebar-width)";

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            if (panelRef.current?.contains(target as Node)) return;
            // Clicks in the sidebar keep the panel open: the tree drives what the
            // panel shows, so browsing folders must not dismiss it.
            if (target?.closest('[data-slot="sidebar"]')) return;
            onClose();
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("pointerdown", onPointerDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    const t = useTranslations("video-list-panel");

    if (!open) return null;

    return (
        <div
            ref={panelRef}
            data-slot="thumbnails-panel"
            style={{
                left: offset,
                maxWidth: `calc(100vw - ${offset})`,
            }}
            className="fixed top-0 bottom-0 z-40 w-[46rem] flex flex-col bg-[#181818] border-r border-[#333] shadow-2xl font-sans text-white"
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] text-sm font-semibold text-[#ff8800]">
                <span>{t("thumbnails")}</span>
                <button
                    onClick={onClose}
                    className="inline-flex items-center justify-center hover:text-[#ff5500]"
                >
                    <X className="size-5" />
                </button>
            </div>

            <div className="flex-1 min-h-0">
                <VideoThumbnails
                    videos={videos}
                    unReadVideoIds={unReadVideoIds}
                    selectedVideoId={selectedVideoId}
                    onSelectVideo={(id) => {
                        onSelectVideo(id);
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}
