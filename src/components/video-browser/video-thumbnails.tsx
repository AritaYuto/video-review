"use client";

import { useEffect, useMemo, useRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { Slider } from "@/ui/slider";
import { ZoomInIcon } from "lucide-react";
import { ThumbnailCell, ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    videos: VideoWithRevision[];
    unReadVideoIds: string[];
    selectedVideoId: string | undefined;
    onSelectVideo?: (videoId: string) => void;
};

export default function VideoThumbnails({ videos, unReadVideoIds, selectedVideoId, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    // Zoom and the resolved-URL cache live in a store: this component unmounts
    // whenever the float panel closes.
    const { thumbSize, setThumbSize, urls, cacheUrl } = useThumbnailGridStore();

    // Hide by how much room one cell has, not by column count. The old
    // column-count thresholds (>=4 hid the title, >=3 the folder) were tuned for
    // the 26rem sidebar strip; in the float panel four columns is the normal
    // wide case, so they hid every label exactly when there was room for them.
    const hideTitle = thumbSize < 110;
    const hideFolder = thumbSize < 150;

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
                <div className="grid gap-3" style={{
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
                            hideTitle={hideTitle}
                            hideFolder={hideFolder}
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
                    // The source frame is 480px wide, so past ~240 the cell is
                    // upscaling the PNG rather than showing more of it.
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
