import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "../storage";

export async function avatar(baseURL: string, email: string): Promise<Buffer<ArrayBuffer> | null> {
    if (!email) {
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })


        if (!user || !user.avatarPath) {
            return null;
        }

        const avatarUrl = await VideoReviewStorage.fallbackURL(user.avatarPath)
        if (!avatarUrl) {
            return null;
        }

        const imgRes = await fetch(baseURL + "/" + avatarUrl);
        if (!imgRes.ok) {
            return null;
        }
        return Buffer.from(await imgRes.arrayBuffer());
    } catch {
        return null;
    }
}
