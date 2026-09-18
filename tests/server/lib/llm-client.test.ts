import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";

// createLLMClient builds its client once at module load from the env module, so each
// provider case mocks the env and re-imports the module.
type EnvOverrides = {
    LLM_PROVIDER?: string;
    LLM_API_KEY?: string;
    LLM_BASE_URL?: string;
    LLM_MODEL?: string;
};

async function loadClient(overrides: EnvOverrides) {
    vi.resetModules();
    vi.doMock("@/server/lib/env", () => ({ env: { ...overrides } }));
    const mod = await import("@/server/lib/integration-clients/llm-client");
    const client = mod.createLLMClient();
    if (!client) throw new Error("client not created");
    return client;
}

type Captured = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

// Replaces fetch with a scripted sequence of OpenAI-format responses and records each request.
function scriptFetch(responses: (Record<string, unknown> | { status: number })[]) {
    const captured: Captured[] = [];
    let index = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
        captured.push({
            url,
            headers: (init.headers ?? {}) as Record<string, string>,
            body: JSON.parse(String(init.body)),
        });
        const next = responses[Math.min(index++, responses.length - 1)];
        if ("status" in next && typeof next.status === "number" && Object.keys(next).length === 1) {
            return new Response("error", { status: next.status });
        }
        return new Response(JSON.stringify(next), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    return captured;
}

const textReply = (content: string) => ({ choices: [{ finish_reason: "stop", message: { role: "assistant", content } }] });

const toolCallReply = (calls: { id?: string; name: string; arguments: string }[]) => ({
    choices: [{
        finish_reason: "tool_calls",
        message: {
            role: "assistant",
            content: null,
            tool_calls: calls.map(c => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })),
        },
    }],
});

function fakeMcp(toolResult = "[]") {
    const callTool = vi.fn(async () => ({ content: [{ type: "text", text: toolResult }] }));
    const listTools = vi.fn(async () => ({
        tools: [{ name: "list_videos", description: "List videos", inputSchema: { type: "object", properties: {} } }],
    }));
    return { client: { callTool, listTools } as unknown as McpClient, callTool, listTools };
}

describe("OpenAI-compatible LLM clients", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.doUnmock("@/server/lib/env");
    });

    describe("request shape per provider", () => {
        it("ollama: calls <base>/v1/chat/completions without auth and asks for JSON on complete()", async () => {
            const captured = scriptFetch([textReply("{\"ok\":true}")]);
            const client = await loadClient({ LLM_PROVIDER: "ollama", LLM_BASE_URL: "http://ollama:11434/", LLM_MODEL: "llama3.2:1b" });

            await client.complete("hello");

            expect(captured[0].url).toBe("http://ollama:11434/v1/chat/completions");
            expect(captured[0].headers.Authorization).toBeUndefined();
            expect(captured[0].body).toMatchObject({ model: "llama3.2:1b", format: "json", stream: false });
        });

        it("openai: calls api.openai.com with a bearer key and no Ollama-only fields", async () => {
            const captured = scriptFetch([textReply("hi")]);
            const client = await loadClient({ LLM_PROVIDER: "openai", LLM_API_KEY: "sk-test", LLM_MODEL: "gpt-5-mini" });

            await client.complete("hello");

            expect(captured[0].url).toBe("https://api.openai.com/v1/chat/completions");
            expect(captured[0].headers.Authorization).toBe("Bearer sk-test");
            expect(captured[0].body).not.toHaveProperty("format");
            expect(captured[0].body).not.toHaveProperty("stream");
        });

        it("gemini: calls Google's OpenAI-compatible endpoint with a bearer key", async () => {
            const captured = scriptFetch([textReply("hi")]);
            const client = await loadClient({ LLM_PROVIDER: "gemini", LLM_API_KEY: "AIza-test" });

            await client.complete("hello");

            expect(captured[0].url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
            expect(captured[0].headers.Authorization).toBe("Bearer AIza-test");
            expect(captured[0].body).toMatchObject({ model: "gemini-2.0-flash" });
        });

        it("openai and gemini refuse to start without an API key", async () => {
            await expect(loadClient({ LLM_PROVIDER: "openai" })).rejects.toThrow(/VIDEO_REVIEW_LLM_API_KEY/);
            await expect(loadClient({ LLM_PROVIDER: "gemini" })).rejects.toThrow(/VIDEO_REVIEW_LLM_API_KEY/);
        });

        it("reports the provider name on HTTP errors", async () => {
            scriptFetch([{ status: 500 }]);
            const client = await loadClient({ LLM_PROVIDER: "openai", LLM_API_KEY: "sk-test" });

            await expect(client.complete("hello")).rejects.toThrow("OpenAI error: HTTP 500");
        });
    });

    describe("completeWithMCP tool loop", () => {
        it("returns the text directly when the model does not call a tool", async () => {
            scriptFetch([textReply("No tools needed")]);
            const client = await loadClient({ LLM_PROVIDER: "openai", LLM_API_KEY: "sk-test" });
            const mcp = fakeMcp();

            const reply = await client.completeWithMCP([{ role: "user", content: "hi" }], mcp.client, "system prompt");

            expect(reply).toBe("No tools needed");
            expect(mcp.callTool).not.toHaveBeenCalled();
        });

        it("runs the requested tool, feeds the result back, and returns the final text", async () => {
            const captured = scriptFetch([
                toolCallReply([{ id: "call_1", name: "list_videos", arguments: "{\"tags\":\"boss\"}" }]),
                textReply("Two boss videos"),
            ]);
            const client = await loadClient({ LLM_PROVIDER: "openai", LLM_API_KEY: "sk-test" });
            const mcp = fakeMcp("[{\"title\":\"Boss A\"},{\"title\":\"Boss B\"}]");

            const reply = await client.completeWithMCP([{ role: "user", content: "boss videos?" }], mcp.client, "system prompt");

            expect(reply).toBe("Two boss videos");
            expect(mcp.callTool).toHaveBeenCalledWith({ name: "list_videos", arguments: { tags: "boss" } });

            // The second request carries the system prompt, the tool definitions and the tool result.
            const second = captured[1].body as { messages: { role: string; content: unknown; tool_call_id?: string }[]; tools: { function: { name: string } }[] };
            expect(second.messages[0]).toEqual({ role: "system", content: "system prompt" });
            expect(second.tools[0].function.name).toBe("list_videos");
            expect(second.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call_1", content: "[{\"title\":\"Boss A\"},{\"title\":\"Boss B\"}]" });
        });

        it("tolerates a missing tool_call id and malformed arguments", async () => {
            const captured = scriptFetch([
                toolCallReply([{ name: "list_videos", arguments: "{not json" }]),
                textReply("done"),
            ]);
            const client = await loadClient({ LLM_PROVIDER: "ollama" });
            const mcp = fakeMcp();

            const reply = await client.completeWithMCP([{ role: "user", content: "hi" }], mcp.client, "system prompt");

            expect(reply).toBe("done");
            expect(mcp.callTool).toHaveBeenCalledWith({ name: "list_videos", arguments: {} });
            const second = captured[1].body as { messages: { role: string; tool_call_id?: string }[] };
            expect(second.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call_0" });
        });

        it("stops after maxTurns when the model keeps calling tools", async () => {
            scriptFetch([toolCallReply([{ id: "c", name: "list_videos", arguments: "{}" }])]);
            const client = await loadClient({ LLM_PROVIDER: "openai", LLM_API_KEY: "sk-test" });
            const mcp = fakeMcp();

            await expect(client.completeWithMCP([{ role: "user", content: "hi" }], mcp.client, "system prompt", 3)).rejects.toThrow("max turns exceeded");
            expect(mcp.callTool).toHaveBeenCalledTimes(3);
        });
    });
});
