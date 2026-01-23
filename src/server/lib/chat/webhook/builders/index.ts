// webhook/builders/index.ts
import { slackBuilder } from "@/server/lib/chat/webhook/builders/slack";
import { teamsBuilder } from "@/server/lib/chat/webhook/builders/teams";
import { WebhookTarget } from "@/server/lib/chat/webhook";

export const builders: Record<WebhookTarget, { build: Function }> = {
    slack: slackBuilder,
    teams: teamsBuilder,
};
