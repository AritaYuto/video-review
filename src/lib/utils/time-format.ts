export function formatElapsed(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${mm}:${ss}`;
}

export function formatDate(date: Date | undefined): string {
    if (!date) return "unknown";
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Coarse "how long ago" for list rows, where the reader only wants to know
 * whether something is fresh. Falls back to formatDate() past a week, since by
 * then the exact date is more useful than a growing week count.
 */
export function formatRelative(date: Date | undefined): string {
    if (!date) return "unknown";
    const elapsedMs = Date.now() - new Date(date).getTime();
    // Clock skew between the uploader and the viewer can put an upload slightly
    // in the future; "just now" reads better than a negative age.
    if (elapsedMs < 60_000) return "just now";

    const minutes = Math.floor(elapsedMs / 60_000);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return formatDate(date);
}
