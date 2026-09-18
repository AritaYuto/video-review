export type LLMStatus = {
    llm: { configured: boolean; provider: string | null; model: string | null };
    mcp: { configured: boolean; reachable: boolean };
};

export async function fetchLLMStatus(token: string): Promise<LLMStatus> {
    const res = await fetch("/api/v1/llm/status", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch LLM status");
    return res.json();
}
