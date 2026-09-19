import { OpenAPIHono } from "@hono/zod-openapi";

// Every router answers a request-validation failure with the same { error } body that the
// declared error responses promise; without this hook zod-openapi returns the raw ZodError.
export const createRouter = () => new OpenAPIHono({
    defaultHook: (result, c) => {
        if (!result.success) {
            const error = result.error.issues
                .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
                .join("; ");
            return c.json({ error }, 400);
        }
    },
});
