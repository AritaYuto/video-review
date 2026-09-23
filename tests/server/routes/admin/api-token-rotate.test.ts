import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "crypto";

// SystemSecret lives in memory so the real authorize and its secret cache are exercised.
const secrets = vi.hoisted(() => new Map<string, string>());

vi.mock("@/server/lib/db", () => ({
    prisma: {
        systemSecret: {
            findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
                const valueHash = secrets.get(where.key);
                return valueHash === undefined ? null : { key: where.key, valueHash };
            }),
            upsert: vi.fn(async ({ where, update }: { where: { key: string }; update: { valueHash: string } }) => {
                secrets.set(where.key, update.valueHash);
                return { key: where.key, valueHash: update.valueHash };
            }),
        },
    },
}));

// Re-imported per test so each starts with an empty secret cache.
let adminRouter: typeof import("@/server/routes/admin").adminRouter;

const OLD_TOKEN = "old-api-token";

function statusRequest(token: string) {
    return adminRouter.request("http://localhost/maintenance/api-token/status", {
        headers: { "x-api-token": token },
    });
}

async function rotate(token: string): Promise<string> {
    const res = await adminRouter.request("http://localhost/maintenance/api-token/rotate", {
        method: "POST",
        headers: { "x-api-token": token },
    });
    expect(res.status).toBe(200);
    return (await res.json()).token;
}

describe("POST /maintenance/api-token/rotate", () => {
    beforeEach(async () => {
        vi.resetModules();
        ({ adminRouter } = await import("@/server/routes/admin"));

        secrets.clear();
        secrets.set("API_TOKEN", hash("sha256", OLD_TOKEN));
    });

    it("rejects the old token right after rotating", async () => {
        // Load the old hash into the secret cache first, as a running server would have.
        expect((await statusRequest(OLD_TOKEN)).status).toBe(200);

        await rotate(OLD_TOKEN);

        const res = await statusRequest(OLD_TOKEN);
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "invalid api token" });
    });

    it("accepts the new token right after rotating", async () => {
        expect((await statusRequest(OLD_TOKEN)).status).toBe(200);

        const newToken = await rotate(OLD_TOKEN);

        expect((await statusRequest(newToken)).status).toBe(200);
    });
});
