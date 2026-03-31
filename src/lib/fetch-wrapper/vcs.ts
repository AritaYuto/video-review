import type { VcsChangeSet } from "@/lib/vcs-types";

export async function fetchVcsChanges(data: {
    videoId: string;
    fromRevisionId?: string;
}): Promise<VcsChangeSet> {
    const params = new URLSearchParams();
    if (data.fromRevisionId) params.set("from", data.fromRevisionId);

    const res = await fetch(`/api/v1/videos/${data.videoId}/vcs-changes?${params.toString()}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json();
}

export async function fetchVcsSummary(videoId: string): Promise<string | null> {
    const res = await fetch(`/api/v1/videos/${videoId}/vcs-summary`);
    if (res.status === 503 || res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { summary: string | null };
    return json.summary;
}
