import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { handleServerError } from "@/server/lib/server-error";
import type { Role } from "@/lib/role";

const mocks = vi.hoisted(() => ({
    verify: vi.fn(),
    sign: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
    default: { verify: mocks.verify, sign: mocks.sign },
}));

vi.mock("@/server/lib/db", () => ({
    prisma: {
        systemSecret: { findUnique: vi.fn().mockResolvedValue({ valueHash: "test-secret" }) },
    },
}));

import { authorizeMedia, AUTH_COOKIE } from "@/server/lib/token";

// Mounts authorizeMedia behind the real handleServerError so the 401/403 mapping is exercised.
function buildApp(roles: Role[]) {
    const child = createRouter();
    child.get("/media", async (c) => {
        await authorizeMedia(c, roles);
        return c.text("ok", 200);
    });
    const app = new OpenAPIHono().basePath("/api").route("/v1", child);
    app.onError(handleServerError);
    return app;
}

describe("authorizeMedia", () => {
    beforeEach(() => {
        mocks.verify.mockReset();
    });

    it("accepts a valid cookie of an allowed role without a bearer header", async () => {
        mocks.verify.mockReturnValue({ id: "u1", role: "admin" });
        // No Authorization header: a 200 proves the cookie path, not the bearer fallback.
        const res = await buildApp(["guest", "viewer", "admin"]).request("http://localhost/api/v1/media", {
            headers: { Cookie: `${AUTH_COOKIE}=good-token` },
        });
        expect(res.status).toBe(200);
    });

    it("rejects a cookie whose token fails verification with a 401", async () => {
        mocks.verify.mockImplementation(() => { throw new Error("bad token"); });
        const res = await buildApp(["guest", "viewer", "admin"]).request("http://localhost/api/v1/media", {
            headers: { Cookie: `${AUTH_COOKIE}=broken` },
        });
        expect(res.status).toBe(401);
    });

    it("falls through to the bearer authorize when no cookie is present", async () => {
        mocks.verify.mockReturnValue({ id: "u1", role: "admin" });
        const res = await buildApp(["guest", "viewer", "admin"]).request("http://localhost/api/v1/media", {
            headers: { Authorization: "Bearer good-token" },
        });
        expect(res.status).toBe(200);
    });

    it("rejects a cookie whose role is not allowed with a 403", async () => {
        mocks.verify.mockReturnValue({ id: "u1", role: "guest" });
        const res = await buildApp(["admin"]).request("http://localhost/api/v1/media", {
            headers: { Cookie: `${AUTH_COOKIE}=good-token` },
        });
        expect(res.status).toBe(403);
    });
});
