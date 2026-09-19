import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { getVideoRouter } from "@/server/routes/videos/[id]/get-video";
import { latestRouter } from "@/server/routes/videos/[id]/latest";
import { revisionsRouter } from "@/server/routes/videos/[id]/revisions";
import { metaDataRouter } from "@/server/routes/videos/[id]/metadata";
import { eventsRouter } from "@/server/routes/videos/[id]/events";
import { vcsRouter } from "@/server/routes/videos/[id]/vcs";
import { patchVideoRouter } from "@/server/routes/videos/[id]/patch";

export const videoByIdRouter = new Hono()
    .route("/", getVideoRouter)
    .route("/", patchVideoRouter)
    .route("/", vcsRouter)
    .route("/latest", latestRouter)
    .route("/revisions", revisionsRouter)
    .route("/events", eventsRouter)
    .route("/metadata", metaDataRouter);
