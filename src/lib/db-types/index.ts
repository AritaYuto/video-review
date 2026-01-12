export type {
    Video,
    VideoRevision,
    UploadSession,
    User,
    UserVideoReadStatus,
    Identity,
    ApiToken
} from "@prisma/client";

export { UploadStorageType } from "@prisma/client";
export { Prisma as PrismaTypes } from "@prisma/client";

import { Prisma as PrismaTypes } from "@prisma/client";
export type VideoComment =
    PrismaTypes.VideoCommentGetPayload<{
        include: {
            slackMessage: true;
        };
    }>;