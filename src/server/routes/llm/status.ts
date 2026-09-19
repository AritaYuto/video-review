import { OpenAPIHono as Hono, createRoute } from "@hono/zod-openapi";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { env } from "@/server/lib/env";

// Each reachability probe opens an MCP session and lists tools, so share the result
// across requests for a short window instead of probing on every page load.
const REACHABILITY_TTL_MS = 30_000;
let reachabilityCache: { reachable: boolean; checkedAt: number } | null = null;

async function isMcpReachable(url: string): Promise<boolean> {
    const now = Date.now();
    if (reachabilityCache && now - reachabilityCache.checkedAt < REACHABILITY_TTL_MS) {
        return reachabilityCache.reachable;
    }
    let reachable = false;
    let mcpClient: McpClient | null = null;
    try {
        mcpClient = new McpClient({ name: "video-review-status", version: "1.0.0" });
        await mcpClient.connect(new StreamableHTTPClientTransport(new URL(url)));
        await mcpClient.listTools();
        reachable = true;
    } catch (err) {
        console.error("[llm/status] MCP reachability check failed:", err);
    } finally {
        await mcpClient?.close?.();
    }
    reachabilityCache = { reachable, checkedAt: now };
    return reachable;
}

export const llmStatusRouter = new Hono()
    .openapi(createRoute({
        method: "get",
        summary: "LLM and MCP availability status",
        description: "Returns whether the LLM provider and MCP server are configured and reachable.",
        path: "/",
        responses: {
            200: { description: "Status" },
            401: { description: "Unauthorized" },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const llm = {
            configured: createLLMClient() !== null,
            provider: env.LLM_PROVIDER ?? null,
            model: env.LLM_MODEL ?? null,
        };

        // The MCP URL stays server-side; the client only needs to know whether search works.
        const mcp = {
            configured: env.MCP_URL !== undefined,
            reachable: env.MCP_URL ? await isMcpReachable(env.MCP_URL) : false,
        };

        return c.json({ llm, mcp });
    });
