import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The guest route is a security lever: with the flag off it must refuse before
// ever reaching the login helper. env and the login helpers are mocked.
const envMock = vi.hoisted(() => ({
    ALLOW_GUEST: true,
}));

const loginMock = vi.hoisted(() => ({
    loginUser: vi.fn(),
    loginAsGuest: vi.fn(),
    loginWithJira: vi.fn(),
}));

vi.mock("@/server/lib/env", () => ({ env: envMock }));
vi.mock("@/server/lib/login", () => loginMock);
vi.mock("@/server/lib/token", () => ({ AUTH_COOKIE: "auth" }));

import { loginRouter } from "@/server/routes/auth/login";

function guestRequest(displayName = "Guest User") {
    return new Request("http://localhost/guest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
    });
}

describe("POST /auth/login/guest", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        envMock.ALLOW_GUEST = true;
        loginMock.loginAsGuest.mockResolvedValue({
            token: "guest-token",
            role: "guest",
            displayName: "Guest User",
            id: "guest-id",
        });
    });

    afterEach(() => {
        envMock.ALLOW_GUEST = true;
    });

    it("returns 403 and never logs in when guest login is disabled", async () => {
        envMock.ALLOW_GUEST = false;

        const res = await loginRouter.request(guestRequest());

        expect(res.status).toBe(403);
        expect(loginMock.loginAsGuest).not.toHaveBeenCalled();
    });

    it("logs in the guest when the flag is enabled", async () => {
        const res = await loginRouter.request(guestRequest());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ token: "guest-token", role: "guest" });
        expect(loginMock.loginAsGuest).toHaveBeenCalledTimes(1);
    });
});
