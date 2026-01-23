function resolveEnv(primary?: string, legacy?: string): string | undefined {
    return primary ?? legacy;
}

function booleanEnv(key?: string): boolean {
    if(!key) return false;
    return key === "true"
}

export function SLACK_TEAM(): string | undefined {
    return resolveEnv(
        process.env.VIDEO_REVIEW_SLACK_TEAM,
        process.env.SLACK_TEAM // deprecated
    );
}

export function SLACK_API_TOKEN(): string | undefined {
    return resolveEnv(
        process.env.VIDEO_REVIEW_SLACK_API_TOKEN,
        process.env.SLACK_API_TOKEN // deprecated
    );
}

export function SLACK_POST_CH(): string | undefined {
    return resolveEnv(
        process.env.VIDEO_REVIEW_SLACK_POST_CH,
        process.env.SLACK_POST_CH // deprecated
    );
}

export function EMAIL_ENABLE(): boolean {
    return booleanEnv(process.env.VIDEO_REVIEW_EMAIL_ENABLE);
}

export function SMTP_HOST(): string | undefined {
    return process.env.VIDEO_REVIEW_SMTP_HOST;
}

export function SMTP_PORT(): string | undefined {
    return process.env.VIDEO_REVIEW_SMTP_PORT;
}

export function EMAIL_FROM(): string | undefined {
    return process.env.VIDEO_REVIEW_EMAIL_FROM;
}

export function JIRA_BASE_URL(): string | undefined {
    return resolveEnv(
        process.env.JIRA_BASE_URL,
        process.env.NEXT_PUBLIC_JIRA_BASE_URL // deprecated
    );
}

export function WEBHOOK_TARGET(): string | undefined {
    return process.env.VIDEO_REVIEW_WEBHOOK_TARGET;
}

export function WEBHOOK_URL(): string | undefined {
    return process.env.VIDEO_REVIEW_WEBHOOK_URL;
}