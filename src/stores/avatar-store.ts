"use client";
import { fetchIntegration, fetchLocal } from "@/lib/fetch-wrapper";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AvatarCacheEntry {
    icon: string | undefined;
    fetched: boolean;
}

interface AvatarState {
    cache: Record<string, AvatarCacheEntry>;
    inflight: Record<string, Promise<void> | undefined>;

    fetchAvatar: (email: string) => Promise<void>;
    icon: (email: string) => string | undefined;
}

export const useAvatarStore = create<AvatarState>()((set, get) => ({
    cache: {},
    inflight: {},

    async fetchAvatar(email: string) {
        const { cache, inflight } = get();

        if (!email) return;

        if (cache[email]?.fetched) {
            return;
        }

        if (inflight[email]) {
            return inflight[email];
        }

        const task = (async () => {
            try {

                const fetchers = [
                    () => fetchLocal(email),
                    () => fetchIntegration(email),
                ];

                for (const fetcher of fetchers) {
                    const icon = await fetcher();
                    if (icon) {
                        set((state) => ({
                            cache: {
                                ...state.cache,
                                [email]: { icon, fetched: true },
                            },
                        }));
                        return;
                    }
                }

                set((state) => ({
                    cache: {
                        ...state.cache,
                        [email]: { icon: undefined, fetched: true },
                    },
                }));
            } finally {
                set((state) => {
                    const next = { ...state.inflight };
                    delete next[email];
                    return { inflight: next };
                });
            }
        })();

        set((state) => ({
            inflight: { ...state.inflight, [email]: task },
        }));
        return task;
    },

    icon(email: string) { return get().cache[email]?.icon ?? undefined },
}));

