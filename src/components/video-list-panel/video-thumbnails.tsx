"use client";

import { Separator } from "@/ui/separator";
import { useEffect, useMemo, useRef, useState } from "react";
import { Video } from "@/lib/db-types";
import { Slider } from "@/ui/slider";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { ZoomInIcon } from "lucide-react";
import { Spinner } from "@/ui/spinner";
import { set } from "zod";

type Props = {
    videos: Video[];
    onSelectVideo?: (videoId: string) => void;
};

export default function VideoThumbnails({ videos, onSelectVideo }: Props) {
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
    const [thumbnailsCache, setThumbnailsCache] = useState<Map<string, string | undefined>>(() => new Map());

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
                            onSelectVideo={onSelectVideo}
                            onResolve={(key, url) => {
                                setThumbnailsCache(prev => {
                                    const next = new Map(prev);
                                    next.set(key, url);
                                    return next;
                                });
                            }}
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
    containerRef,
    cache,
    onSelectVideo,
    onResolve,
}: {
    video: Video;
    hideTitle: boolean;
    hideFolder: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    cache: Map<string, string | undefined>;
    onSelectVideo?: (videoId: string) => void;
    onResolve?: (key: string, resolveURL: string | undefined) => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const id = video.id;
    const key = `thumbnails/${id}/thumb.png`;
    const cached = cache.get(key);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (!ref.current || cached !== undefined) return;

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;

                    setIsResolving(true);

                    fetchMediaUrl(key).then(ret => {
                        onResolve?.(key, ret.ok ? ret.data : undefined);
                    }).finally(() => {
                        setIsResolving(false);
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
            onClick={() => onSelectVideo?.(id)}
        >
            <div className="bg-[#111]" style={{ aspectRatio: "16 / 9" }}>
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
