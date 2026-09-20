import "server-only";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import type { Role } from "@/lib/role";

// Media is served by opaque storage key, so guest checks first map a key back to its video.
export async function videoIdForStorageKey(key: string): Promise<string | null> {
    const segments = key.split("/");

    // Thumbnails are stored under "thumbnails/<videoId>/...".
    if (segments[0] === "thumbnails") {
        return segments[1] ?? null;
    }

    // Revision variants append "_<width>p" before the extension; match against the stored base path.
    const base = key.replace(/_\d+p(\.[^./]+)$/, "$1");
    const revision = await prisma.videoRevision.findFirst({
        where: { filePath: { in: [base, key] } },
        select: { videoId: true },
    });
    if (revision) return revision.videoId;

    // A drawing is stored per comment, so reach its video through the comment.
    const comment = await prisma.videoComment.findFirst({
        where: { drawingPath: key },
        select: { videoId: true },
    });
    return comment?.videoId ?? null;
}

export async function assertRoleCanSeeVideo(videoId: string, role: Role): Promise<void> {
    if (role !== "guest") return;

    const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { guestVisible: true },
    });
    if (!video?.guestVisible) {
        throw new ServerError("forbidden", 403);
    }
}
