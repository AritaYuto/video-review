import { Role } from "@/lib/role";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "@/server/lib/db";

import "server-only"

type SecretKey = {
    dbKey: string;
    envKey: string;
};

export const Secrets = {
    JWT: { dbKey: "JWT_SECRET", envKey: "JWT_SECRET" },
    API: { dbKey: "API_TOKEN", envKey: "VIDEO_REVIEW_API_TOKEN" },
} as const;

const cache = new Map<string, string>();

export class JwtError extends Error {
    status: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "JwtError";
        this.status = statusCode;
        this.message = message;
    }
}

async function loadFromDb(name: string) {
    const token = await prisma.systemSecret.findUnique({
        where: { key: name },
    });
    return token?.valueHash;
}

export async function getSecret({ dbKey, envKey }: SecretKey): Promise<string | undefined> {
    const cached = cache.get(dbKey);
    if (cached) return cached;

    const fromDb = await loadFromDb(dbKey);
    if (fromDb) {
        cache.set(dbKey, fromDb);
        return fromDb;
    }

    const fromEnv = process.env[envKey];
    if (!fromEnv) {
        throw undefined;
    }

    cache.set(dbKey, fromEnv);
    return fromEnv;
}

export const getJwtSecret = () => getSecret(Secrets.JWT);

export const getApiSecret = () => getSecret(Secrets.API);

export async function verifyToken(token: string): Promise<JwtPayload> {
    const secret = await getJwtSecret();
    if (!secret) {
        throw new JwtError("jwt configuration is missing", 500);
    }

    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string") {
        throw new JwtError("invalid token payload", 401);
    }

    return decoded;
}

export async function signToken(payload: Record<string, any>): Promise<string> {
    const secret = await getJwtSecret();
    if (!secret) {
        throw new JwtError("jwt configuration is missing", 500);
    }
    return jwt.sign(payload, secret, { expiresIn: "1d" });
}

export async function authorize(req: Request, passedRoles: Role[]) {
    // NOTE:
    // x-api-token (VIDEO_REVIEW_API_TOKEN) is the primary authentication method.
    // x-maintenance-token is kept temporarily for backward compatibility.
    const apiToken = req.headers.get("x-api-token");
    const maintenanceToken = req.headers.get("x-maintenance-token");

    try {
        if (
            apiToken &&
            apiToken === await getApiSecret()
        ) {
            return {
                type: "api-token" as const,
                role: "admin",
            };
        }
    } catch {}

    if (
        maintenanceToken &&
        maintenanceToken === process.env.ADMIN_MAINTENANCE_TOKEN
    ) {
        return {
            type: "api-token" as const,
            role: "admin",
        };
    }

    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            throw new JwtError("missing authorization header", 500);
        }

        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            throw new JwtError("invalid authorization format", 401);
        }

        const decoded = await verifyToken(token);
        if (typeof decoded === "string") {
            throw new JwtError("invalid token", 401);
        }

        if (!passedRoles.includes(decoded.role)) {
            throw new JwtError("forbidden", 403);
        }
        return {
            type: "jwt" as const,
            decoded,
        };
    } catch {
        throw new JwtError("unauthorized", 401);
    }
}

