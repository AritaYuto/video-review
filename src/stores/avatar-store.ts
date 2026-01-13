"use client";
import { fetchIntegration, fetchLocal } from "@/lib/fetch-wrapper";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AvatarCacheEntry {
    icon: string | undefined;
    fetched: boolean;
}

interface AvatarState {
    cache: Map<string, AvatarCacheEntry>;
    inflight: Map<string, Promise<void> | undefined>;

    fetchAvatar: (email: string) => Promise<void>;
    icon: (email: string) => string | undefined;
}

export const useAvatarStore = create<AvatarState>()((set, get) => ({
    cache: new Map<string, AvatarCacheEntry>(),
    inflight: new Map<string, Promise<void>>(),

    async fetchAvatar(email: string) {
        if (!email) return;

        const { cache, inflight } = get();

        if (cache.get(email)?.fetched) {
            return;
        }

        if (inflight.has(email)) {
            return inflight.get(email);
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
                        set((state) => {
                            const next = new Map(state.cache);
                            next.set(email, { icon, fetched: true });
                            return { cache: next };
                        });
                        return;
                    }
                }

                set((state) => {
                    const next = new Map(state.cache);
                    next.set(email, { icon: undefined, fetched: true });
                    return { cache: next };
                });
            } finally {
                set((state) => {
                    const next = new Map(state.inflight);
                    next.delete(email);
                    return { inflight: next };
                });
            }
        })();

        set((state) => {
            const next = new Map(state.inflight);
            next.set(email, task);
            return { inflight: next };
        });

        return task;
    },

    icon(email: string) {
        return get().cache.get(email)?.icon;
    },
}));

