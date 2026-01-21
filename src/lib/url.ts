
export function createVideoCommentLink(videoId: string | null, commentId: string | null): string | null {
    if (videoId === null) {
        return null;
    }
    if (commentId === null) {
        return null;
    }
    const baseURL = window.location.origin
    return `${baseURL}/video-review/review/${videoId}?comment=${commentId}`
}

export function createVideoTimeLink(videoId: string | null, time: number): string | null {
    if (videoId === null) {
        return null;
    }
    const baseURL = window.location.origin
    return `${baseURL}/video-review/review/${videoId}?t=${time}`
}

export function createOpenSceneLink(scenePath: string): string | null {
    const template = process.env.NEXT_PUBLIC_URL_SCHEMA;
    if (!template) {
        return null;
    }
    if (template.includes("{scenePath}")) {
        return template.replace("{scenePath}", scenePath);
    }
    const sep = template.endsWith("/") ? "" : "/";
    return `${template}${sep}${scenePath}`;
}

export function OpenScene(scenePath: string): void {
    const link = createOpenSceneLink(scenePath);
    if (!link) {
        return;
    }
    window.location.href = link;
}
