import { avatar as getJiraAvatar } from "@/server/lib/avatar/jira"
import { avatar as getSlackAvatar } from "@/server/lib/avatar/slack"
import { avatar as getUserAvatar } from "@/server/lib/avatar/user"

export async function avatar(baseURL: string, email: string): Promise<Buffer<ArrayBuffer> | null> {
    const userAvatar = await getUserAvatar(baseURL, email);
    if (userAvatar) {
        return userAvatar;
    }

    const jiraAvatar = await getJiraAvatar(email);
    if (jiraAvatar) {
        return jiraAvatar;
    }

    const slackAvatar = await getSlackAvatar(email);
    if (slackAvatar) {
        return slackAvatar
    }

    return null;
}
