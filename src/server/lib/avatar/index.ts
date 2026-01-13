export { avatar as avatarLocal } from "@/server/lib/avatar/user"

import { avatar as getJiraAvatar } from "@/server/lib/avatar/jira"
import { avatar as getSlackAvatar } from "@/server/lib/avatar/slack"

export async function avatarIntegration(email: string): Promise<Buffer<ArrayBuffer> | undefined> {
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
