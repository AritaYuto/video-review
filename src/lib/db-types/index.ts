export type {
    Video,
    VideoRevision,
    UploadSession,
    User,
    UserVideoReadStatus,
    Identity,
    VideoComment,
    PromptTemplate,
} from "@prisma/client";



export { UploadStorageType } from "@prisma/client";
export { Prisma as PrismaTypes } from "@prisma/client";

import { Video, VideoRevision } from "@prisma/client";
export type VideoWithRevision = Video & {
  latestRevision: Pick<VideoRevision, "revision" | "uploadedAt" | "tags"> | null;
};