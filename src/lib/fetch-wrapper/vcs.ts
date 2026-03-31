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
