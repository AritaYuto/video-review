import { avatar as getJiraAvatar } from "@/server/lib/avatar/jira"
import { avatar as getSlackAvatar } from "@/server/lib/avatar/slack"

export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | null> {
    // todo: getUserAvatar(email);

    const jiraAvatar = getJiraAvatar(email);
    if (jiraAvatar) {
        return jiraAvatar;
    }

    const slackAvatar = getSlackAvatar(email);
    if (slackAvatar) {
        return slackAvatar
    }

    return null;
}
