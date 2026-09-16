"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { VideoWithRevision } from "@/lib/db-types";
import { useSidebar } from "@/ui/sidebar";
import VideoThumbnails from "@/components/video-browser/video-thumbnails";

// Radix layers that own Escape while open: dialogs, and anything in the popper wrapper.
const OTHER_LAYERS = '[role="dialog"], [data-radix-popper-content-wrapper]';

type Props = {
    open: boolean;
    videos: VideoWithRevision[];
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
    // --sidebar-width stays set while the sidebar is collapsed off-canvas.
    const offset = state === "collapsed" ? "0px" : "var(--sidebar-width)";

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            // Radix's Escape handler does not stop propagation; let the topmost layer take it.
            if (document.querySelector(OTHER_LAYERS)) return;
            onClose();
        };

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            if (panelRef.current?.contains(target as Node)) return;
            // Only the review area counts as outside: dialogs and popovers are portaled
            // to the document root and must not dismiss the panel.
            if (!target?.closest('[data-slot="review-main"]')) return;
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

    // Below the mobile breakpoint the sidebar is a modal sheet whose overlay would cover this panel.
    if (!open || isMobile) return null;

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
                    aria-label={t("thumbnailsClose")}
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
