"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api-client";
import { Role } from "@/lib/role";

interface AuthState {
    displayName: string | null;
    userId: string | null;
    email: string | null;
    role: Role;
    token: string | null;

    verifyAuth: () => Promise<string | null>;
    setAuth: (
        userId: string,
        email: string | null,
        role: Role,
        token: string,
        displayName: string,
    ) => void;
    setDisplayName: (name: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            displayName: null,
            userId: null,
            email: null,
            role: "guest",
            token: null,
            canUseIssueTracker: false,

            verifyAuth: async () => {
                const token = get().token;
                if (!token) return null;

                try {
                    const res = await api.auth.verify.$post({ json: { token } });
                    if (res.status === 200) return (await res.json()).decoded.id;
                } catch {}

                get().logout();
                return null;
            },

            setAuth: (userId, email, role, token, displayName) => {
                set({ userId, email, role, token, displayName });
            },

            setDisplayName: (name) => {
                set({displayName: name})
            },

            logout: () => {
                set({userId: null, token: null});
            },
        }),
        {
            name: "auth-store",
        },
    ),
);
