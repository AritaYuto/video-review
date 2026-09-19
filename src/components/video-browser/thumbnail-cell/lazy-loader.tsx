import { useEffect, useRef, useState } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { Spinner } from "@/components/ui/spinner";

export const thumbnailKey = (videoId: string) => `thumbnails/${videoId}/thumb.png`;

type Props = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
    cache: Map<string, string | undefined>;
    onResolve?: (key: string, resolveURL: string | undefined) => void;
};

export function ThumbnailLazyLoader({ video, containerRef, cache, onResolve }: Props) {
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
        <div ref={ref} className="bg-background aspect-video">
            {cached ? (
                <img src={cached} alt="" className="w-full h-full object-cover" />
            ) : isResolving ? (
                <div className="flex items-center justify-center w-full h-full">
                    <Spinner />
                </div>
            ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground w-full h-full">
                    thumbnail
                </div>
            )}
        </div>
    );
}
