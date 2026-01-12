import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | null> {
    if (!email) {
        return null;
    }

    try {
        const res = await slack.users.lookupByEmail({ email });

        if (!res.ok || !res.user) {
            return null;
        }

        const avatarUrl =
            res.user.profile?.image_48 ??
            res.user.profile?.image_72;

        if (!avatarUrl) {
            return null;
        }

        const imgRes = await fetch(avatarUrl);
        if (!imgRes.ok) {
            return null;
        }

        return Buffer.from(await imgRes.arrayBuffer());
    } catch (e){
        return null;
    }
}
