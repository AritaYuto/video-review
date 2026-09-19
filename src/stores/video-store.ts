import { create } from "zustand";
import { Video, VideoRevision, VideoWithRevision } from "@/lib/db-types";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { useVideoDateFilterStore, useVideoCommentsDateFilterStore } from "@/stores/date-filter-store";
import { api } from "@/lib/api-client";

interface VideoState {
    videos: VideoWithRevision[];
    allVideoTags: string[],
    selectedVideo: Video | null;
    revisions: VideoRevision[],
    selectedRevision: VideoRevision | null;
    loading: boolean;

    fetchVideos: () => Promise<void>;
    selectVideo: (video: Video) => Promise<void>;
    nextVideo:() => Promise<boolean>;
    selectVideoRevision: (revision: VideoRevision) => void;
    updateRevisionTags: (revisionId: string, tags: string[]) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    allVideoTags: [],
    selectedVideo: null,
    revisions: [],
    selectedRevision: null,
    loading: false,

    async fetchVideos() {
        set({ loading: true });
        const s = useVideoSearchStore.getState();
        const videoDateRange = useVideoDateFilterStore.getState().resolve();
        const commentsDateRange = useVideoCommentsDateFilterStore.getState().resolve();
        const res = await api.videos.index.$get({
            query: {
                videoFrom: videoDateRange?.from?.toISOString(),
                videoTo: videoDateRange?.to?.toISOString(),
                commentsFrom: commentsDateRange?.from?.toISOString(),
                commentsTo: commentsDateRange?.to?.toISOString(),
                user: s.user || undefined,
                filterTree: s.filterTree || undefined,
                hasIssue: s.hasIssue ? "true" : undefined,
                hasDrawing: s.hasDrawing ? "true" : undefined,
                hasComment: s.hasComment ? "true" : undefined,
                tags: s.tags.length > 0 ? s.tags.join(",") : undefined,
            },
        });
        if (res.status !== 200) throw new Error("Failed to fetch videos");
        const videos = await res.json();
        const tags = await api.videos.tags.$get();
        set({ videos, loading: false, allVideoTags: tags.status === 200 ? await tags.json() : [] });
    },

    async selectVideo(video) {
        set({ selectedVideo: video, selectedRevision: null, revisions: [], loading: true });
        const res = await api.videos[":id"].revisions.$get({ param: { id: video.id } });
        if (res.status !== 200) throw new Error("Failed to fetch revisions");
        const revs = await res.json();
        set({
            revisions: revs,
            selectedRevision: revs[0] ?? null,
            loading: false,
        });
    },

    async nextVideo(){
        const currVideo = get().selectedVideo;
        const videos = get().videos;
        const currIndex = videos.findIndex((v) => v.id === currVideo?.id);

        if(currIndex !== -1 && videos.length > currIndex + 1) {
            const next = videos[currIndex + 1];
            await get().selectVideo(next);
            return true;
        }
        return false;
    },

    selectVideoRevision(revision) {
        set({ selectedRevision: revision });
    },

    async updateRevisionTags(revisionId, tags) {
        const res = await api.videos[":id"].metadata.annotate.$post({
            param: { id: revisionId },
            json: { tags: tags.join(",") },
        });
        if (res.status !== 200) return;
        set((state) => ({
            selectedRevision:
                state.selectedRevision?.id === revisionId
                    ? { ...state.selectedRevision, tags }
                    : state.selectedRevision,
            revisions: state.revisions.map((r) =>
                r.id === revisionId ? { ...r, tags } : r
            ),
        }));
    },
}));
