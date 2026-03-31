import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { getVideoRouter } from "@/server/routes/videos/[id]/get-video";
import { latestRouter } from "@/server/routes/videos/[id]/latest";
import { revisionsRouter } from "@/server/routes/videos/[id]/revisions";
import { metaDataRouter } from "@/server/routes/videos/[id]/metadata";
import { eventsRouter } from "@/server/routes/videos/[id]/events";
import { vcsChangesRouter } from "@/server/routes/videos/[id]/vcs-changes";
import { patchVideoRouter } from "@/server/routes/videos/[id]/patch";

export const videoByIdRouter = new Hono();

videoByIdRouter.route("/", getVideoRouter);
videoByIdRouter.route("/", patchVideoRouter);
videoByIdRouter.route("/latest", latestRouter);
videoByIdRouter.route("/revisions", revisionsRouter);
videoByIdRouter.route("/events", eventsRouter);
videoByIdRouter.route("/metadata", metaDataRouter);
videoByIdRouter.route("/vcs-changes", vcsChangesRouter);
