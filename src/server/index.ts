import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { v1Router } from "@/server/routes/v1";
import { swaggerUI } from "@hono/swagger-ui";
import { ensurePrismaWarmup } from "@/server/lib/db";
import { handleServerError } from "@/server/lib/server-error";

export const app = new Hono().basePath("/api");

app.route("/v1", v1Router);

// A thrown ServerError is rendered here, so guarded routes can just call authorize().
app.onError(handleServerError);

// OpenAPI and Swagger UI
app.doc('/specification', {
    openapi: '3.0.0',
    info: {
        title: 'API',
        version: '1.0.0',
    },
});

app.get('/docs',
    swaggerUI({
        url: '/api/specification',
    })
);

app.get('/internal/warmup', async (c) => {
   const ret = await ensurePrismaWarmup();
   if (ret) return c.json({ status: true });
   return c.json({ status: false });
});
