import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThumbnailGridStore {
    /** Cell width in px, driven by the grid's zoom slider. */
    thumbSize: number;
    setThumbSize: (size: number) => void;

    /** storage key -> resolved media URL (undefined = resolved but absent). */
    urls: Map<string, string | undefined>;
    cacheUrl: (key: string, url: string | undefined) => void;
}

/**
 * State the thumbnail grid must keep across mounts.
 *
 * The grid used to be permanently mounted in the sidebar's vertical split, so
 * plain component state survived the whole session. It now lives in a float
 * panel that unmounts on close, which would drop the resolved-URL cache and
 * re-request every thumbnail on each reopen, and reset the zoom every time.
 *
 * Only `thumbSize` is persisted: resolved media URLs can be presigned and
 * expire, so reviving them across reloads would show broken images.
 */
export const useThumbnailGridStore = create<ThumbnailGridStore>()(
    persist(
        (set) => ({
            thumbSize: 160,
            setThumbSize: (thumbSize) => set({ thumbSize }),

            urls: new Map(),
            cacheUrl: (key, url) =>
                set((state) => {
                    const urls = new Map(state.urls);
                    urls.set(key, url);
                    return { urls };
                }),
        }),
        {
            name: "thumbnail-grid",
            partialize: (state) => ({ thumbSize: state.thumbSize }),
        },
    ),
);
