"use client";

import { useEffect, useMemo, useRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { Slider } from "@/ui/slider";
import { ZoomInIcon } from "lucide-react";
import { ThumbnailCell } from "@/components/video-browser/thumbnail-cell";
import { ThumbnailLazyLoader, thumbnailKey } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    videos: VideoWithRevision[];
    unReadVideoIds: string[];
    selectedVideoId: string | undefined;
    onSelectVideo?: (videoId: string) => void;
};

export default function VideoThumbnails({ videos, unReadVideoIds, selectedVideoId, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { thumbSize, setThumbSize, urls, cacheUrl } = useThumbnailGridStore();

    const unread = useMemo(() => new Set(unReadVideoIds), [unReadVideoIds]);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    useEffect(() => {
        if (!selectedVideoId) return;

        const el = itemRefs.current.get(selectedVideoId);
        if (!el) return;

        el.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [selectedVideoId]);

    return (
        <div
            ref={containerRef}
            style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
            className="font-sans text-white bg-[#181818] w-full h-full flex flex-col"
        >
            {/* Grid */}
            <div className="flex-1 overflow-auto p-3">
                <div className="grid gap-1.5" style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
                }}>
                    {videos.map(video => (
                        <ThumbnailCell
                            key={video.id}
                            ref={el => {
                                if (el) {
                                    itemRefs.current.set(video.id, el);
                                } else {
                                    itemRefs.current.delete(video.id);
                                }
                            }}
                            video={video}
                            selectedVideoId={selectedVideoId}
                            unread={unread.has(video.id)}
                            thumbnailUrl={urls.get(thumbnailKey(video.id))}
                            onSelectVideo={onSelectVideo}
                        >
                            <ThumbnailLazyLoader
                                video={video}
                                containerRef={containerRef}
                                cache={urls}
                                onResolve={cacheUrl}
                            />
                        </ThumbnailCell>
                    ))}
                </div>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3 px-3 py-3 border-t border-[#333] bg-[#141414]">
                <ZoomInIcon></ZoomInIcon>
                <Slider
                    min={60}
                    // Source thumbnails are 480px wide; past ~240 the cell only upscales.
                    max={240}
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
        </div>
    );
}
