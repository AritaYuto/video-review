import { app } from "@/server";
import { handle } from 'hono/vercel'
export const runtime = "nodejs";

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
// Chunked uploads ask for their resume position with HEAD and for capabilities with OPTIONS.
export const HEAD = handle(app)
export const OPTIONS = handle(app)