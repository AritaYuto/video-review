import { forwardRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ThumbnailDetailCard } from "@/components/video-browser/thumbnail-cell/detail-card";

type Props = {
    video: VideoWithRevision;
    selectedVideoId: string | undefined;
    unread: boolean;
    /** Resolved by the lazy loader; reused by the hover card. */
    thumbnailUrl: string | undefined;
    children?: React.ReactNode;
    onSelectVideo?: (videoId: string) => void;
};

/** Picture-only grid cell; hovering it opens the detail card beside it. */
export const ThumbnailCell = forwardRef<HTMLDivElement, Props>(
    function ThumbnailCell({ video, selectedVideoId, unread, thumbnailUrl, onSelectVideo, children }, ref) {
        const isSelected = video.id === selectedVideoId;
        const select = () => onSelectVideo?.(video.id);

        return (
            <HoverCard openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                    <div
                        ref={ref}
                        data-slot="thumbnail-card"
                        role="button"
                        tabIndex={0}
                        aria-label={video.title}
                        className={cn(
                            "relative rounded-sm overflow-hidden ring-1 cursor-pointer transition-[box-shadow]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#888]",
                            isSelected ? "ring-2 ring-[#ff8800]" : "ring-[#2a2a2a] hover:ring-[#888]"
                        )}
                        onClick={select}
                        // HoverCardTrigger preventDefaults touchstart, which cancels the synthesized click.
                        onPointerUp={(e) => { if (e.pointerType === "touch") select(); }}
                        onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            select();
                        }}
                    >
                        {unread && (
                            <span className="absolute top-1 left-1 z-10 text-[8px] px-1 py-[1px] bg-red-500 text-white rounded leading-none">
                                NEW
                            </span>
                        )}
                        {children}
                    </div>
                </HoverCardTrigger>

                <HoverCardContent
                    data-slot="thumbnail-detail"
                    side="right"
                    sideOffset={8}
                    collisionPadding={12}
                    onClick={select}
                    className="w-[34rem] max-w-[calc(100vw-2rem)] flex gap-3 p-3 bg-[#202020] border-[#555] font-sans text-white cursor-pointer"
                >
                    <ThumbnailDetailCard video={video} thumbnailUrl={thumbnailUrl} />
                </HoverCardContent>
            </HoverCard>
        );
    }
);
