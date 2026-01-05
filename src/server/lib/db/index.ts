import { PrismaClient } from "@prisma/client";
import { styleText } from "node:util";

const defaultLogThreshold = 20;
const isDev = process.env.NODE_ENV === "development";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    prismaReady?: Promise<void>;
};

async function warmup(client: PrismaClient): Promise<void> {
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in environment variables.");
}

if (!globalForPrisma.prisma) {
    const client = new PrismaClient({
        log: isDev
            ? [
                  { level: "query", emit: "event" },
                  { level: "error", emit: "stdout" },
                  { level: "warn", emit: "stdout" },
              ]
            : [
                  { level: "error", emit: "stdout" },
                  { level: "warn", emit: "stdout" },
              ],
    });

    if (isDev) {
        client.$on("query", (e) => {
            if (e.duration < defaultLogThreshold) return;

            const dur = (() => {
                if (e.duration < defaultLogThreshold * 1.1)
                    return styleText("green", `${e.duration}ms`);
                if (e.duration < defaultLogThreshold * 1.2)
                    return styleText("blue", `${e.duration}ms`);
                if (e.duration < defaultLogThreshold * 1.3)
                    return styleText("yellow", `${e.duration}ms`);
                if (e.duration < defaultLogThreshold * 1.4)
                    return styleText("redBright", `${e.duration}ms`);
                return styleText("red", `${e.duration}ms`);
            })();

            console.info(`prisma:query - ${dur} - ${e.query}`);
        });
    }

    globalForPrisma.prisma = client;
    globalForPrisma.prismaReady = warmup(client).catch(async (e) => {
        await client.$disconnect().catch(() => {});
        globalForPrisma.prisma = undefined;
        globalForPrisma.prismaReady = undefined;
        throw e;
    });
}

await globalForPrisma.prismaReady;
export const prisma = globalForPrisma.prisma!;