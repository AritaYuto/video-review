"use client";

import { Separator } from "@/ui/separator";
import { useEffect, useMemo, useRef, useState } from "react";
import { Video } from "@/lib/db-types";
import { Slider } from "@/ui/slider";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { ZoomInIcon } from "lucide-react";

type Props = {
    videos: Video[];
    onSelect?: (data: ThumbnailData) => void;
};

type ThumbnailData = {
    id: string;
    title: string;
    folderKey: string;
    url?: string;
};

export default function VideoThumbnails({ videos, onSelect }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [thumbSize, setThumbSize] = useState(160);
    const [containerWidth, setContainerWidth] = useState(0);
    const gap = 16;
    const currentColumns = useMemo(() => {
        return Math.max(
            1,
            Math.floor((containerWidth + gap) / (thumbSize + gap))
        );
    }, [containerWidth, thumbSize]);

    const hideTitle = useMemo(() => currentColumns >= 3, [currentColumns]);
    const hideFolder = useMemo(() => currentColumns >= 2, [currentColumns]);
    const thumbnailsCache = useRef<Map<string, ThumbnailData>>(new Map());

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect;
            setContainerWidth(rect.width);
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ height: "calc(100% - 50px)", scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
            className="font-sans text-white bg-[#181818] w-full h-full flex flex-col border-r border-[#333]"
        >
            {/* Grid */}
            <div className="flex-1 overflow-auto p-3">
                <div className="grid gap-3" style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
                }}>
                    {videos.map(video => (
                        <ThumbnailCell
                            key={video.id}
                            video={video}
                            hideTitle={hideTitle}
                            hideFolder={hideFolder}
                            onSelect={onSelect}
                            containerRef={containerRef}
                            cache={thumbnailsCache}
                        />
                    ))}
                </div>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3 px-3 py-3 border-t border-[#333] bg-[#141414]">
                <ZoomInIcon></ZoomInIcon>
                <Slider
                    min={60}
                    max={200}
                    step={10}
                    value={[thumbSize]}
                    onValueChange={(v) => {
                        setThumbSize(v[0])
                    }}
                    onValueCommit={(v) => {
                        setThumbSize(v[0])
                    }}
                    className="w-full"
                />
            </div>
            <Separator className="bg-[#333]" />
        </div>
    );
}

function ThumbnailCell({
    video,
    hideTitle,
    hideFolder,
    onSelect,
    containerRef,
    cache,
}: {
    video: Video;
    hideTitle: boolean;
    hideFolder: boolean;
    onSelect?: (data: ThumbnailData) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    cache: React.RefObject<Map<string, ThumbnailData>>;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const key = `thumbnails/${video.id}/thumb.png`;
    const cached = cache.current.get(key);

    useEffect(() => {
        if (!ref.current || cached?.url) return;

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;

                    fetchMediaUrl(key).then(ret => {
                        cache.current.set(key, {
                            id: video.id,
                            title: video.title,
                            folderKey: video.folderKey,
                            url: ret.ok ? ret.data : undefined,
                        });
                        observer.disconnect();
                    });
                });
            },
            {
                root: containerRef.current,
                rootMargin: "200px",
            }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [key, cached]);

    return (
        <div
            ref={ref}
            className="bg-[#202020] rounded-md overflow-hidden border border-[#333] hover:border-[#555] cursor-pointer transition"
            onClick={() => cached && onSelect?.(cached)}
        >
            <div className="bg-[#111]" style={{ aspectRatio: "16 / 9" }}>
                {cached?.url ? (
                    <img src={cached.url} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
                        thumbnail
                    </div>
                )}
            </div>

            {(!hideTitle || !hideFolder) && (
                <div className="p-2">
                    {!hideTitle && (
                        <div className="text-xs truncate">{video.title}</div>
                    )}
                    {!hideFolder && (
                        <div className="text-xs text-[#777] truncate">
                            {video.folderKey}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
