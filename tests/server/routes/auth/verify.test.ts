import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/token", () => {
    return {
        verifyToken: vi.fn(),
    };
});

import { verifyRouter } from "@/server/routes/auth/verify";

describe("verifyRouter", () => {
    it("returns 400 when token is missing", async () => {
        const res = await verifyRouter.request("http://localhost/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "missing token" });
    });
});
