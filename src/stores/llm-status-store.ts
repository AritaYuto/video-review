"use client";
import { create } from "zustand";
import { fetchLLMStatus, LLMStatus } from "@/lib/fetch-wrapper/llm-status";
import { useAuthStore } from "@/stores/auth-store";

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
            const status = await fetchLLMStatus(token);
            const available = status.llm.configured && status.mcp.configured && status.mcp.reachable;
            set({ available, status, checked: true });
        } catch {
            set({ available: false, status: null, checked: true });
        }
    },
}));
