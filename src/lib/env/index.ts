import * as api from "@/lib/fetch-wrapper";

export function resolveEnv(primary?: string, legacy?: string): string | undefined {
    return primary ?? legacy;
}

export function booleanEnv(key?: string): boolean {
    if(!key) return false;
    return key === "true"
}

export function typeEnv<T>(key: string | undefined, defaultType: string | undefined): T {
    if(!key || key === "") return defaultType as T;
    return key as T;
}

export const env = {
    PUBLIC_VIDEO_REVIEW_TITLE: process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE ?? "VideoReview",
    PUBLIC_VIDEO_REVIEW_DESC: process.env.NEXT_PUBLIC_VIDEO_REVIEW_DESC ?? "Internal Video Review Tool",
    PUBLIC_VIDEO_REVIEW_URL_SCHEMA: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_URL_SCHEMA, process.env.NEXT_PUBLIC_URL_SCHEMA),
    PUBLIC_LOGIN_BG_URL: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_BG, process.env.NEXT_PUBLIC_LOGIN_BG),
    PUBLIC_LOGIN_DEFAULT_TYPE: typeEnv<api.LoginType>(resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_DEFAULT_TYPE, process.env.NEXT_PUBLIC_LOGIN_DEFAULT_TYPE) , "guest"),
    PUBLIC_JIRA_ISSUE_TYPE_TASK: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_JIRA_ISSUE_TYPE_TASK, process.env.NEXT_PUBLIC_JIRA_ISSUE_TYPE_TASK),
    PUBLIC_JIRA_ISSUE_TYPE_BUG: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_JIRA_ISSUE_TYPE_BUG, process.env.NEXT_PUBLIC_JIRA_ISSUE_TYPE_BUG),
    USE_AI_SUPPORT: booleanEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_USE_AI_SUPPORT),
} as const;
