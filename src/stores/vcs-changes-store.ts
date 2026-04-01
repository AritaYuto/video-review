import { create } from "zustand";
import * as api from "@/lib/fetch-wrapper";
import type { VcsChangeSet } from "@/lib/vcs-types";
import type { VideoRevision } from "@/lib/db-types";

interface VcsChangesState {
    data: VcsChangeSet | null;
    loading: boolean;
    error: string | null;
    summary: string | null;
    summaryLoading: boolean;

    fetchChanges: (videoId: string, prevRevision: VideoRevision | null) => Promise<void>;
    fetchSummary: (videoId: string) => Promise<void>;
    clear: () => void;
}

export const useVcsChangesStore = create<VcsChangesState>((set) => ({
    data: null,
    loading: false,
    error: null,
    summary: null,
    summaryLoading: false,

    fetchChanges: async (videoId, prevRevision) => {
        set({ loading: true, error: null, summary: null });
        try {
            const data = await api.fetchVcsChanges({
                videoId,
                fromRevisionId: prevRevision?.id,
            });
            set({ data, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : String(err), loading: false });
        }
    },

    fetchSummary: async (videoId) => {
        set({ summaryLoading: true });
        try {
            const summary = await api.fetchVcsSummary(videoId);
            set({ summary, summaryLoading: false });
        } catch {
            set({ summaryLoading: false });
        }
    },

    clear: () => {
        set({ data: null, error: null, summary: null });
    },
}));
