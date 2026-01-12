import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "../storage";

export async function avatar(email: string): Promise<string | undefined> {
    if (!email) {
        return undefined;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })


        if (!user || !user.avatarPath) {
            return undefined;
        }

        const fallbackURL = await VideoReviewStorage.fallbackURL(user.avatarPath)
        if (!fallbackURL) {
            return undefined;
        }
        return fallbackURL;
    } catch (e) {
        return undefined;
    }
}
