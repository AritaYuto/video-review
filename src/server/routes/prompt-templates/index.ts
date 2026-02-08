import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import { authorize } from "@/server/lib/token";
import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const promptRouter = new Hono();

const QuerySchema = z.object({
    key: z.string().optional(),
});


const UpdateQuerySchema = z.object({
    key: z.string().optional(),
    kinds: z.string().array().optional(),
    prompt: z.string().optional(),
});


promptRouter.openapi({
    method: "get",
    summary: "",
    path: "/kinds",
    responses: {
        200: {
            description: "",
        }
    },
}, async (c) => {
    const items = [ "scenes", "log", "subtitle", "transcription" ]
    return c.json({ items });
});


promptRouter.openapi({
    method: "get",
    summary: "",
    path: "/keys",
    responses: {
        200: {
            description: "",
        }
    },
}, async (c) => {
    const items = [ "caption_context", "annotation" ]
    return c.json({ items });
});


promptRouter.openapi({
    method: "get",
    summary: "",
    path: "/",
    request: { query: QuerySchema },
    responses: {
        200: {
            description: "",
        }
    },
}, async (c) => {
    const query = c.req.valid("query");
    const { key } = query;

    if(key) {
        const item = await prisma.promptTemplate.findUnique({ where: { key }});
        return c.json({ items: item ? [ item ] : [] });
    } else {
        const items = await prisma.promptTemplate.findMany();
        return c.json({ items });
    }
});


promptRouter.openapi({
    method: "patch",
    summary: "",
    path: "/",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: UpdateQuerySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "",
        }
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = c.req.valid("json");
    const { key, kinds, prompt } = body;

    if (!key || !kinds || !prompt) {
        return c.json({ error: "key, kinds, prompt are required" }, 400);
    }

    const item = await prisma.promptTemplate.findUnique({ where: { key } });
    if(!item) {
        const item = await prisma.promptTemplate.create({ data: { key, kinds, prompt }});
        return c.json({ item }, 200);
    } else {
        const item = await prisma.promptTemplate.update({
            where: { key },
            data: { key, kinds, prompt }
        });
        return c.json({ item }, 200);
    }
});