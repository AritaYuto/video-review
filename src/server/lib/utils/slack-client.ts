import { WebClient } from "@slack/web-api";
import * as env from "@/lib/env";

const createSlackClient = (): WebClient | null => {
    const token = env.SLACK_API_TOKEN();
    if(!token) {
        return null;
    }

    return new WebClient(token);
}

export const SlackClient = createSlackClient();