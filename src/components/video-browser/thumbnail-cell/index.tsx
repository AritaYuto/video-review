import { VideoWithRevision } from "@/lib/db-types";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useFormatter } from "next-intl";
import { CalendarDays, Folder, Layers, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { Spinner } from "@/components/ui/spinner";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export const thumbnailKey = (videoId: string) => `thumbnails/${videoId}/thumb.png`;

type ThumbnailCellProps = {
    video: VideoWithRevision;
    selectedVideoId: string | undefined;
    unread: boolean;
    /** Resolved by the lazy loader; reused by the hover card. */
    thumbnailUrl: string | undefined;
    children?: React.ReactNode;
    onSelectVideo?: (videoId: string) => void;
};

export const ThumbnailCell = forwardRef<HTMLDivElement, ThumbnailCellProps>(
    function ThumbnailCell(props, ref) {
        const { video, selectedVideoId, unread, thumbnailUrl, onSelectVideo, children } = props;
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
                    <ThumbnailDetail video={video} thumbnailUrl={thumbnailUrl} />
                </HoverCardContent>
            </HoverCard>
        );
    }
);

const MAX_TAGS = 6;

function ThumbnailDetail({ video, thumbnailUrl }: { video: VideoWithRevision; thumbnailUrl: string | undefined }) {
    const latest = video.latestRevision;
    const format = useFormatter();
    // metadata.ts splits tags on ",", so a cleared tag list is [""].
    const allTags = latest?.tags?.filter(Boolean) ?? [];
    const tags = allTags.slice(0, MAX_TAGS);
    const hiddenTagCount = allTags.length - tags.length;

    return (
        <>
            <div className="w-[16rem] shrink-0 bg-[#111] rounded overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
                {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
                        thumbnail
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-1.5 text-xs text-[#bbb]">
                <div className="text-sm font-medium text-white leading-snug line-clamp-2 break-all">
                    {video.title}
                </div>

                {latest && (
                    <div className="flex items-center gap-1.5">
                        <Layers className="size-3.5 shrink-0" />
                        <span>v{latest.revision}</span>
                    </div>
                )}

                {latest && (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <CalendarDays className="size-3.5 shrink-0" />
                        <span className="truncate">
                            {format.dateTime(new Date(latest.uploadedAt), { dateStyle: "medium", timeStyle: "short" })}
                            <span className="text-[#777]">
                                {" · "}
                                {format.relativeTime(new Date(latest.uploadedAt))}
                            </span>
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-1.5 min-w-0">
                    <Folder className="size-3.5 shrink-0" />
                    <span className="truncate">{video.folderKey}</span>
                </div>

                {tags.length > 0 && (
                    <div className="flex items-start gap-1.5">
                        <Tag className="size-3.5 shrink-0 mt-[2px]" />
                        <div className="flex flex-wrap gap-1 min-w-0">
                            {tags.map(tag => (
                                <span
                                    key={tag}
                                    className="max-w-full text-[10px] px-1 py-[1px] bg-[#333] text-[#ddd] rounded truncate"
                                >
                                    {tag}
                                </span>
                            ))}
                            {hiddenTagCount > 0 && (
                                <span className="text-[10px] px-1 py-[1px] text-[#888]">+{hiddenTagCount}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

type ThumbnailLazyLoaderProps = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
    cache: Map<string, string | undefined>;
    onResolve?: (key: string, resolveURL: string | undefined) => void;
};

export function ThumbnailLazyLoader({ video, containerRef, cache, onResolve }: ThumbnailLazyLoaderProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const key = thumbnailKey(video.id);
    const cached = cache.get(key);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (!ref.current || cached !== undefined) return;

        const observer = new IntersectionObserver(
            entries => {
                if (!entries[0].isIntersecting) return;

                setIsResolving(true);
                fetchMediaUrl(key)
                    .then(ret => onResolve?.(key, ret.ok ? ret.data : undefined))
                    .finally(() => {
                        setIsResolving(false);
                        observer.disconnect();
                    });
            },
            { root: containerRef.current, rootMargin: "200px" }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [cached, key]);

    return (
        <div ref={ref} className="bg-[#111]" style={{ aspectRatio: "16 / 9" }}>
            {cached ? (
                <img src={cached} alt="" className="w-full h-full object-cover" />
            ) : isResolving ? (
                <div className="flex items-center justify-center w-full h-full">
                    <Spinner />
                </div>
            ) : (
                <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
                    thumbnail
                </div>
            )}
        </div>
    );
}
