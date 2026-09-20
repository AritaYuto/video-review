import { vi } from "vitest";

// Spreads the real token module but forces the login gate to pass, so a route
// test drives the handler rather than the auth check.
export function withAuthorizePass(actual: typeof import("@/server/lib/token")) {
    return {
        ...actual,
        authorize: vi.fn(async () => ({ type: "api-token" as const, role: "admin" as const })),
    };
}
