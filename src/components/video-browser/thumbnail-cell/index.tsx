import { Video, VideoWithRevision } from "@/lib/db-types";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ThumbnailCellProps = {
    video: Video;
    selectedVideoId: string | undefined;
    unread: boolean;
    hideTitle: boolean;
    hideFolder: boolean;
    children?: React.ReactNode;
    onSelectVideo?: (videoId: string) => void;
};

export const ThumbnailCell = forwardRef<HTMLDivElement, ThumbnailCellProps>(
    function ThumbnailCell(props, ref) {
        const { video, selectedVideoId, unread, hideTitle, hideFolder, onSelectVideo, children } = props;
        const isSelected = video.id === selectedVideoId;
        const latest = (video as VideoWithRevision).latestRevision;
        // Cap the chips: a revision can carry many tags, and a card that reflows
        // to three lines of tags stops being scannable.
        const tags = latest?.tags?.slice(0, 3) ?? [];

        return (
            <div
                ref={ref}
                className={cn(
                    "relative bg-[#202020] rounded-md overflow-hidden border",
                    isSelected ? "border-[#ff8800]" : "border-transparent"
                )}
                onClick={() => onSelectVideo?.(video.id)}
            >
                {unread && (
                    <span className="absolute top-1 left-1 z-10 text-[8px] px-1 py-[1px] bg-red-500 text-white rounded leading-none">
                        NEW
                    </span>
                )}

                {latest && (
                    <span className="absolute top-1 right-1 z-10 text-[10px] px-1 py-[1px] bg-black/70 text-white rounded leading-none">
                        v{latest.revision}
                    </span>
                )}

                {children}

                {(!hideTitle || !hideFolder) && (
                    <div className="p-2">
                        {!hideTitle && (
                            <div className="text-xs truncate">{video.title}</div>
                        )}
                        {!hideFolder && (
                            <div className="text-xs text-[#777] truncate">
                                {video.folderKey} · {formatRelative(latest?.uploadedAt)}
                            </div>
                        )}
                        {!hideFolder && tags.length > 0 && (
                            <div className="flex gap-1 mt-1 overflow-hidden">
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="text-[10px] px-1 py-[1px] bg-[#333] text-[#bbb] rounded truncate"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

type ThumbnailLazyLoaderProps = {
    video: Video;
    containerRef: React.RefObject<HTMLDivElement | null>;
    cache: Map<string, string | undefined>;
    onResolve?: (key: string, resolveURL: string | undefined) => void;
};

export function ThumbnailLazyLoader({ video, containerRef, cache, onResolve }: ThumbnailLazyLoaderProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const key = `thumbnails/${video.id}/thumb.png`;
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
            <Tooltip>
                <TooltipTrigger asChild>
                    {cached ? (
                        <img src={cached} className="w-full h-full object-cover" />
                    ) : isResolving ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
                            thumbnail
                        </div>
                    )}
                </TooltipTrigger>
                <TooltipContent className="max-w-65">
                    <div className="text-xs font-medium leading-tight">
                        {video.title}
                    </div>
                    <div className="mt-1 text-[11px] text-[#aaa]">
                        {formatDate((video as VideoWithRevision).latestRevision?.uploadedAt)}
                        {" · Rev."}
                        {(video as VideoWithRevision).latestRevision?.revision ?? "-"}
                    </div>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
