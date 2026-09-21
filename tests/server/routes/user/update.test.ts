import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { ServerError } from "@/server/lib/server-error";

// Prisma and authorize are mocked so this exercises the authorization rules
// without touching the shared test database.
const prismaMock = vi.hoisted(() => ({
    $transaction: vi.fn(),
    user: {
        update: vi.fn(),
    },
    identity: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { userRouter } from "@/server/routes/user";

function updateRequest(body: unknown) {
    return userRouter.request("http://localhost/update", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("PATCH /update", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
        prismaMock.user.update.mockResolvedValue({
            id: "user-a",
            email: "a@example.com",
            displayName: "A renamed",
            role: "viewer",
        });
    });

    it("rejects an unauthenticated caller before touching the database", async () => {
        // authorize throws; the route lets it propagate to app.onError, so at this
        // subrouter level the status is Hono's default rather than the mapped 401
        // (that mapping is covered in tests/server/server-error.test.ts). What
        // matters here is that no profile write happens.
        authorizeMock.mockRejectedValue(new ServerError("unauthorized", 401));

        await updateRequest({ userId: "user-a", displayName: "A renamed" });

        expect(prismaMock.$transaction).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("refuses to update another user's profile", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "user-a", role: "viewer" } });

        const res = await updateRequest({ userId: "user-b", displayName: "hijacked" });

        expect(res.status).toBe(403);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("updates the caller's own profile", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "user-a", role: "viewer" } });

        const res = await updateRequest({ userId: "user-a", displayName: "A renamed" });

        expect(res.status).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
        expect(prismaMock.user.update.mock.calls[0][0]).toMatchObject({
            where: { id: "user-a" },
            data: { displayName: "A renamed" },
        });
    });

    it("changes the password on the 'password' identity after verifying the current one", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "user-a", role: "viewer" } });
        const currentHash = await bcrypt.hash("old-pass", 10);
        prismaMock.identity.findFirst.mockResolvedValue({ id: "identity-a", secretHash: currentHash });
        prismaMock.identity.update.mockResolvedValue({});

        const res = await updateRequest({ userId: "user-a", pass: "new-pass-123", currentPass: "old-pass" });

        expect(res.status).toBe(200);
        // The identity is looked up under provider "password" (login's provider), not "local".
        expect(prismaMock.identity.findFirst).toHaveBeenCalledWith({
            where: { userId: "user-a", provider: "password" },
        });
        expect(prismaMock.identity.update).toHaveBeenCalledTimes(1);
        const updateArg = prismaMock.identity.update.mock.calls[0][0];
        expect(updateArg.where).toEqual({ id: "identity-a" });
        // The stored hash is a fresh hash of the new password, never the raw value.
        expect(updateArg.data.secretHash).not.toBe("new-pass-123");
        expect(await bcrypt.compare("new-pass-123", updateArg.data.secretHash)).toBe(true);
    });

    it("rejects a wrong current password without writing", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "user-a", role: "viewer" } });
        const currentHash = await bcrypt.hash("old-pass", 10);
        prismaMock.identity.findFirst.mockResolvedValue({ id: "identity-a", secretHash: currentHash });

        const res = await updateRequest({ userId: "user-a", pass: "new-pass-123", currentPass: "wrong-pass" });

        // The guard throws ServerError(403); at this subrouter level the throw surfaces
        // as Hono's default status (the 403 mapping via app.onError is covered elsewhere).
        // What matters is that no password write happens.
        expect(res.status).not.toBe(200);
        expect(prismaMock.identity.update).not.toHaveBeenCalled();
    });

    it("rejects a password change that omits the current password", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "user-a", role: "viewer" } });
        prismaMock.identity.findFirst.mockResolvedValue({ id: "identity-a", secretHash: await bcrypt.hash("old-pass", 10) });

        const res = await updateRequest({ userId: "user-a", pass: "new-pass-123" });

        expect(res.status).not.toBe(200);
        expect(prismaMock.identity.update).not.toHaveBeenCalled();
    });
});
