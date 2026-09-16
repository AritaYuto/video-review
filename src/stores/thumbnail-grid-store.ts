import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThumbnailGridStore {
    thumbSize: number;
    setThumbSize: (size: number) => void;

    /** storage key -> media URL; undefined means resolved but absent. */
    urls: Map<string, string | undefined>;
    cacheUrl: (key: string, url: string | undefined) => void;
}

// Lives outside the grid component because the float panel unmounts on close.
// Only thumbSize is persisted: media URLs may be presigned and expire.
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
