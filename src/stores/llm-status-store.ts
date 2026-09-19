"use client";
import { create } from "zustand";
import type { InferResponseType } from "hono/client";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export type LLMStatus = InferResponseType<typeof api.llmStatus.index.$get, 200>;

interface LLMStatusState {
    available: boolean;
    status: LLMStatus | null;
    checked: boolean;
    check: () => Promise<void>;
}

export const useLLMStatusStore = create<LLMStatusState>()((set) => ({
    available: false,
    status: null,
    checked: false,

    check: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
            set({ available: false, status: null, checked: true });
            return;
        }
        try {
            const res = await api.llmStatus.index.$get();
            if (res.status !== 200) throw new Error("Failed to fetch LLM status");
            const status = await res.json();
            const available = status.llm.configured && status.mcp.configured && status.mcp.reachable;
            set({ available, status, checked: true });
        } catch {
            set({ available: false, status: null, checked: true });
        }
    },
}));
