import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_API_TOKEN);

export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | undefined> {
    if (!email) {
        return undefined;
    }

    try {
        const res = await slack.users.lookupByEmail({ email });
        if (!res.ok || !res.user) {
            return undefined;
        }

        const avatarUrl =
            res.user.profile?.image_48 ??
            res.user.profile?.image_72;

        if (!avatarUrl) {
            return undefined;
        }

        const imgRes = await fetch(avatarUrl);
        if (!imgRes.ok) {
            return undefined;
        }

        return Buffer.from(await imgRes.arrayBuffer());
    } catch (e){
        return undefined;
    }
}
