import { create } from "zustand";
import * as api from "@/lib/fetch-wrapper";
import type { VcsChangeSet } from "@/lib/vcs-types";
import type { VideoRevision } from "@/lib/db-types";

interface VcsChangesState {
    data: VcsChangeSet | null;
    loading: boolean;
    error: string | null;

    fetchChanges: (videoId: string, prevRevision: VideoRevision | null) => Promise<void>;
    clear: () => void;
}

export const useVcsChangesStore = create<VcsChangesState>((set) => ({
    data: null,
    loading: false,
    error: null,

    fetchChanges: async (videoId, prevRevision) => {
        set({ loading: true, error: null });
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

    clear: () => {
        set({ data: null, error: null });
    },
}));
