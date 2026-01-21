function resolveEnv(primary?: string, legacy?: string ): string | undefined {
  return primary ?? legacy;
}

export function getSlackTeam(): string | undefined {
  return resolveEnv(
    process.env.SLACK_TEAM,
    process.env.NEXT_PUBLIC_SLACK_TEAM // deprecated
  );
}

export function getJiraBaseUrl(): string | undefined {
  return resolveEnv(
    process.env.JIRA_BASE_URL,
    process.env.NEXT_PUBLIC_JIRA_BASE_URL // deprecated
  );
}
