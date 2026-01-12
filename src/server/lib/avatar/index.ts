import { avatar as getJiraAvatar } from "@/server/lib/avatar/jira"
import { avatar as getSlackAvatar } from "@/server/lib/avatar/slack"
import { avatar as getUserAvatar } from "@/server/lib/avatar/user"

export async function avatar(email: string): Promise<string | undefined> {
    const userAvatar = await getUserAvatar(email);
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

    return undefined;
}
