import { useEffect } from "react";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { env } from "@/lib/env";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

// The worker writes `<name>_<width>p.mp4` beside the source for each preset; the smallest is enough for a preview.
const presetWidths = env.RESOLUTION_PRESETS.filter(w => w > 0);
const previewWidth = presetWidths.length > 0 ? Math.min(...presetWidths) : undefined;
const previewKey = (filePath: string) =>
    previewWidth === undefined ? undefined : filePath.replace(/\.[^./]+$/, "") + `_${previewWidth}p.mp4`;

// Resolves the preview variant's URL once per key; a resolver miss is remembered as undefined so it is not retried.
function usePreviewUrl(filePath: string | undefined): { url: string | undefined; forget: () => void } {
    const key = filePath ? previewKey(filePath) : undefined;
    // Subscribe to this key only.
    const url = useThumbnailGridStore(s => (key ? s.urls.get(key) : undefined));
    const cacheUrl = useThumbnailGridStore(s => s.cacheUrl);
    const forgetUrl = useThumbnailGridStore(s => s.forgetUrl);

    useEffect(() => {
        if (!key || useThumbnailGridStore.getState().urls.has(key)) return;
        fetchMediaUrl(key).then(ret => cacheUrl(key, ret.ok ? ret.data : undefined));
    }, [key]);

    return { url, forget: () => key && forgetUrl(key) };
}

type Props = {
    filePath: string | undefined;
    /** Still image shown until the video plays, and instead of it when it cannot. */
    posterUrl: string | undefined;
    onDuration?: (seconds: number) => void;
};

/** Muted, looping preview of the smallest transcoded variant; falls back to the poster. */
export function PreviewVideo({ filePath, posterUrl, onDuration }: Props) {
    const { url, forget } = usePreviewUrl(filePath);

    if (url) {
        return (
            <video
                data-slot="thumbnail-preview"
                src={url}
                poster={posterUrl}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => onDuration?.(e.currentTarget.duration)}
                // Nextcloud resolves without checking existence, and a cached presigned URL can expire.
                onError={forget}
                className="w-full h-full object-cover"
            />
        );
    }

    if (posterUrl) {
        return <img src={posterUrl} alt="" className="w-full h-full object-cover" />;
    }

    return (
        <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
            thumbnail
        </div>
    );
}
