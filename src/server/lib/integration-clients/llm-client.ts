import Anthropic from "@anthropic-ai/sdk";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { env } from "@/server/lib/env";

export type ChatTurn = {
    role: "user" | "assistant";
    content: string;
};

type OpenAIToolCall = { id?: string; function: { name: string; arguments: string } };

// OpenAI-compatible providers may return unparsable arguments or omit tool_call ids
// (older Ollama builds); treat both as recoverable rather than failing the whole turn.
function parseToolArguments(raw: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
        return {};
    }
}

function toolCallId(tc: OpenAIToolCall, index: number): string {
    return tc.id ?? `call_${index}`;
}
type OpenAIMessage = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string };

export interface LLMClient {
    complete(prompt: string): Promise<string>;
    completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns?: number,
    ): Promise<string>;
}

class ClaudeClient implements LLMClient {
    private client: Anthropic;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }

    async complete(prompt: string): Promise<string> {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
        });
        const block = response.content[0];
        if (block.type !== "text") throw new Error("Unexpected response type from Claude");
        return block.text;
    }

    async completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns = 10,
    ): Promise<string> {
        const { tools: mcpTools } = await mcpClient.listTools();

        const anthropicTools: Anthropic.Tool[] = mcpTools.map((t) => ({
            name: t.name,
            description: t.description ?? "",
            input_schema: (t.inputSchema ?? { type: "object", properties: {} }) as Anthropic.Tool["input_schema"],
        }));

        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        for (let turn = 0; turn < maxTurns; turn++) {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 4096,
                system,
                tools: anthropicTools,
                messages: anthropicMessages,
            });

            const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

            if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
                const text = response.content.find((b) => b.type === "text");
                return text ? text.text : "";
            }

            anthropicMessages.push({ role: "assistant", content: response.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                toolUseBlocks.map(async (block) => {
                    if (block.type !== "tool_use") throw new Error("unexpected block type");
                    const result = await mcpClient.callTool({ name: block.name, arguments: block.input as Record<string, unknown> });
                    const content = result.content as { type: string; text?: string }[];
                    const text = content.map((c) => c.type === "text" ? c.text ?? "" : "").join("");
                    return { type: "tool_result" as const, tool_use_id: block.id, content: text };
                }),
            );

            anthropicMessages.push({ role: "user", content: toolResults });
        }

        throw new Error("max turns exceeded");
    }
}

type OpenAICompatibleOptions = {
    /** Full chat completions URL, e.g. https://api.openai.com/v1/chat/completions */
    endpoint: string;
    model: string;
    apiKey?: string;
    /** Name used in error messages. */
    label: string;
    /** Extra request fields the provider understands (e.g. Ollama's JSON mode for complete()). */
    completionExtras?: Record<string, unknown>;
};

// Ollama, Gemini and OpenAI all speak the OpenAI chat completions API; only the endpoint,
// the auth header and a few optional request fields differ.
class OpenAICompatibleClient implements LLMClient {
    private readonly options: OpenAICompatibleOptions;

    constructor(options: OpenAICompatibleOptions) {
        this.options = options;
    }

    private headers(): Record<string, string> {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.options.apiKey) headers["Authorization"] = `Bearer ${this.options.apiKey}`;
        return headers;
    }

    private async post(body: Record<string, unknown>): Promise<Response> {
        const res = await fetch(this.options.endpoint, {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify({ model: this.options.model, ...body }),
        });
        if (!res.ok) throw new Error(`${this.options.label} error: HTTP ${res.status}`);
        return res;
    }

    async complete(prompt: string): Promise<string> {
        const res = await this.post({
            messages: [{ role: "user", content: prompt }],
            ...(this.options.completionExtras ?? {}),
        });
        const data = await res.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content;
    }

    async completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns = 10,
    ): Promise<string> {
        const { tools: mcpTools } = await mcpClient.listTools();

        const tools = mcpTools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description ?? "",
                parameters: t.inputSchema ?? { type: "object", properties: {} },
            },
        }));

        const chat: OpenAIMessage[] = [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        for (let turn = 0; turn < maxTurns; turn++) {
            const res = await this.post({ messages: chat, tools });
            const data = await res.json() as { choices: { finish_reason: string; message: { role: string; content: string | null; tool_calls?: OpenAIToolCall[] } }[] };
            const choice = data.choices[0];

            if (!choice.message.tool_calls?.length) {
                return choice.message.content ?? "";
            }

            chat.push({ role: "assistant", content: null, tool_calls: choice.message.tool_calls });

            for (const [index, tc] of choice.message.tool_calls.entries()) {
                const args = parseToolArguments(tc.function.arguments);
                const result = await mcpClient.callTool({ name: tc.function.name, arguments: args });
                const content = result.content as { type: string; text?: string }[];
                const text = content.map((c) => c.type === "text" ? c.text ?? "" : "").join("");
                chat.push({ role: "tool", content: text, tool_call_id: toolCallId(tc, index) });
            }
        }

        throw new Error("max turns exceeded");
    }
}

function buildClient(): LLMClient | null {
    const provider = env.LLM_PROVIDER;
    if (!provider) return null;

    const requireApiKey = (name: string): string => {
        const apiKey = env.LLM_API_KEY;
        if (!apiKey) throw new Error(`VIDEO_REVIEW_LLM_API_KEY is required for the ${name} provider`);
        return apiKey;
    };

    switch (provider) {
        case "claude":
            return new ClaudeClient(requireApiKey("Claude"), env.LLM_MODEL ?? "claude-haiku-4-5-20251001");
        case "openai": {
            const baseUrl = (env.LLM_BASE_URL ?? "https://api.openai.com").replace(/\/$/, "");
            return new OpenAICompatibleClient({
                endpoint: `${baseUrl}/v1/chat/completions`,
                apiKey: requireApiKey("OpenAI"),
                model: env.LLM_MODEL ?? "gpt-5-mini",
                label: "OpenAI",
            });
        }
        case "gemini":
            return new OpenAICompatibleClient({
                endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                apiKey: requireApiKey("Gemini"),
                model: env.LLM_MODEL ?? "gemini-2.0-flash",
                label: "Gemini",
            });
        case "ollama": {
            const baseUrl = (env.LLM_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
            return new OpenAICompatibleClient({
                endpoint: `${baseUrl}/v1/chat/completions`,
                model: env.LLM_MODEL ?? "llama3.1:8b",
                label: "Ollama",
                // Ollama's JSON mode keeps single-shot completions (summaries, annotations) parseable.
                completionExtras: { format: "json", stream: false },
            });
        }
        default:
            throw new Error(`Unknown LLM provider: ${provider}. Supported: "claude", "openai", "gemini", "ollama"`);
    }
}

const _client = buildClient();

export function createLLMClient(): LLMClient | null {
    return _client;
}
