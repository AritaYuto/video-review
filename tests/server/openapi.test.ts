import { describe, expect, it, vi } from "vitest";

// Document generation walks every declared schema, so a schema zod-to-openapi
// cannot express fails only here, never in a route test. Prisma is mocked: the
// routers are imported, not called.
vi.mock("@/server/lib/db", () => ({ prisma: {}, ensurePrismaWarmup: vi.fn() }));

import { app } from "@/server/index";
import { v1Router } from "@/server/routes/v1";

describe("OpenAPI document", () => {
    it("is generated for the whole v1 tree", () => {
        expect(() => v1Router.getOpenAPIDocument({ openapi: "3.0.0", info: { title: "t", version: "1" } })).not.toThrow();
    });

    it("is served at /api/specification", async () => {
        const res = await app.request("http://localhost/api/specification");

        expect(res.status).toBe(200);
        const doc = await res.json();
        expect(doc.paths["/api/v1/videos"]).toBeDefined();
        expect(doc.components.schemas.JsonValue).toBeDefined();
    });
});
