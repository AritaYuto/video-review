import type { VCSProvider } from "./provider";
import { GitHubProvider } from "./providers/github";
import { GitLabProvider } from "./providers/gitlab";
import { SVNProvider } from "./providers/svn";
import { PerforceProvider } from "./providers/perforce";

export type VCSProviderConfig =
    | { provider: "github";   owner: string; repo: string; token: string; branch?: string }
    | { provider: "gitlab";   projectId: string; token: string; branch?: string }
    | { provider: "svn";      repoUrl: string; username?: string; password?: string }
    | { provider: "perforce"; serverUrl: string; user: string; token: string };

export function createVCSProvider(config: VCSProviderConfig): VCSProvider {
    switch (config.provider) {
        case "github":   return new GitHubProvider(config);
        case "gitlab":   return new GitLabProvider(config);
        case "svn":      return new SVNProvider(config);
        case "perforce": return new PerforceProvider(config);
    }
}
