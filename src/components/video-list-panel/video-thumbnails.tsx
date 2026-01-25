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

    const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
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

    useEffect(() => {
        const thumbnails: ThumbnailData[] = [];
        for (const v of videos) {
            const storageKey = `thumbnails/${v.id}/thumb.png`;

            if (!thumbnailsCache.current.has(storageKey)) {
                thumbnailsCache.current.set(storageKey, {
                    id: v.id,
                    title: v.title,
                    folderKey: v.folderKey,
                    url: undefined,
                });
            } else {
                const existing = thumbnailsCache.current.get(storageKey)!;
                thumbnails.push(existing);
            }
        }
        setThumbnails(thumbnails);

        let canceled = false;
        const load = async () => {
            const targets = Array.from(thumbnailsCache.current.entries())
                .filter(([_, data]) => !data.url)
                .slice(0, 12);

            await Promise.all(
                targets.map(async ([storageKey, data]) => {
                    if (canceled) return;

                    try {
                        const url = await fetchMediaUrl(storageKey);
                        if (canceled) return;

                        console.log("Loaded thumbnail:", url, storageKey);

                        thumbnailsCache.current.set(storageKey, {
                            ...data,
                            url,
                        });
                        setThumbnails(Array.from(thumbnailsCache.current.values()));
                    } catch {
                        // not found
                    }
                })
            );
        };

        void load();
        return () => { canceled = true; };
    }, [videos]);

    return (
        <div
            ref={containerRef}
            style={{ height: "calc(100% - 50px)", scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
            className="font-sans text-white bg-[#181818] w-full h-full flex flex-col border-r border-[#333]"
        >
            {/* Grid */}
            <div className="flex-1 overflow-auto p-3">
                <div
                    className="grid gap-3"
                    style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
                    }}
                >
                    {thumbnails.map((thumbnail) => (
                        <div
                            key={thumbnail.folderKey + "/" + thumbnail.title}
                            className="bg-[#202020] rounded-md overflow-hidden border border-[#333] hover:border-[#555] cursor-pointer transition"
                            onClick={() => onSelect?.(thumbnail)}
                        >
                            <div
                                className="bg-[#111]"
                                style={{ aspectRatio: "16 / 9" }}
                            >
                                {/* Thumbnail */}
                                {thumbnail.url ? (
                                    <img src={thumbnail.url} alt={thumbnail.title} className="w-full h-full object-cover " />
                                ) : (
                                    <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
                                        thumbnail
                                    </div>
                                )}
                            </div>
                            {/* Meta */}
                            {(!hideTitle || !hideFolder) && (
                                <div className="p-2">
                                    {!hideTitle && (
                                        <div className="text-xs truncate">{thumbnail.title}</div>
                                    )}
                                    {!hideFolder && (
                                        <div className="text-xs text-[#777] truncate">{thumbnail.folderKey}</div>
                                    )}
                                </div>
                            )}
                        </div>
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