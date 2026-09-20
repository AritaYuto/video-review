import { describe, expect, it } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { handleServerError, ServerError } from "@/server/lib/server-error";

// Drives the real handleServerError the app installs, so it can't drift from production.
function buildApp() {
    const child = createRouter();
    child.get("/forbidden", () => { throw new ServerError("forbidden", 403); });
    child.get("/server-fault", () => { throw new ServerError("jira token is xyz", 500); });
    child.get("/plain-error", () => { throw new Error("boom"); });

    const app = new OpenAPIHono().basePath("/api").route("/v1", child);
    app.onError(handleServerError);
    return app;
}

describe("handleServerError", () => {
    it("returns a 4xx ServerError's status and message", async () => {
        const res = await buildApp().request("http://localhost/api/v1/forbidden");
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "forbidden" });
    });

    it("keeps a 5xx status but hides the message", async () => {
        const res = await buildApp().request("http://localhost/api/v1/server-fault");
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "internal error" });
    });

    it("maps any other error to a 500", async () => {
        const res = await buildApp().request("http://localhost/api/v1/plain-error");
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "internal error" });
    });
});
