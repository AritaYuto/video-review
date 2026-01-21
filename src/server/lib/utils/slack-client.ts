import { WebClient } from "@slack/web-api";

const createSlackClient = (): WebClient | null => {
    const token = process.env.SLACK_API_TOKEN;
    if(!token) {
        return null;
    }

    return new WebClient(token);
}

export const SlackClient = createSlackClient();