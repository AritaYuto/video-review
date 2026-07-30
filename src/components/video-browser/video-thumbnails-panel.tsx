"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { VideoWithRevision } from "@/lib/db-types";
import { useSidebar } from "@/ui/sidebar";
import VideoThumbnails from "@/components/video-browser/video-thumbnails";

// Any Radix layer that owns Escape while it is open. Dialogs expose role="dialog";
// popovers, dropdowns and selects all render inside the popper wrapper.
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
    // The sidebar keeps its width variable while collapsed off-canvas, so the
    // offset has to come from its open state rather than from the variable.
    const offset = state === "collapsed" ? "0px" : "var(--sidebar-width)";

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            // Radix registers its own Escape handler in the capture phase and does
            // not stop propagation, so without this the panel would close along
            // with whatever dialog or popover the user actually meant to dismiss.
            if (document.querySelector(OTHER_LAYERS)) return;
            onClose();
        };

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            if (panelRef.current?.contains(target as Node)) return;
            // Close only for clicks that land in the review area itself. Stating it
            // positively matters: Radix renders dialogs and popovers in portals at
            // the document root, so a "not inside the sidebar" test would treat the
            // search dialog and the date filter as outside clicks and dismiss the
            // panel -- while filtering is exactly what you do with it open.
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

    // Not supported below the sidebar's mobile breakpoint: there the sidebar is a
    // modal Sheet at z-50 whose overlay covers this panel and swallows its
    // clicks, and the only way in is the toggle inside that sheet. Refusing to
    // render is honest; a panel stranded behind an overlay is not. Covers the
    // desktop-open-then-resize case too. A full-screen sheet variant is the way
    // to actually support it.
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
