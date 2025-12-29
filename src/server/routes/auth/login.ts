import { JwtError, signToken, verifyToken } from "@/lib/jwt";
import { Role } from "@/lib/role";
import { Hono } from "hono";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';

export const loginRouter = new Hono();

loginRouter.post("/admin", async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email) {
            return c.json({ error: "missing email" }, 400);
        }

        if (!password) {
            return c.json({ error: "missing password" }, 400);
        }

        // ユーザーを探す（事前登録済みの管理者のみログイン可能）
        const identity = await prisma.identity.findUnique({
            where: {
                provider_providerUid: {
                    provider: "password",
                    providerUid: email,
                }
            },
            include: {
                user: true,
            }
        });

        if (!identity || !identity.secretHash) {
            return c.json({ error: "authentication failed" }, 401);
        }

        const isPasswordValid = await bcrypt.compare(password, identity.secretHash);
        if (!isPasswordValid) {
            return c.json({ error: "authentication failed" }, 401);
        }

        const role: Role = 'admin';
        let tokenPayload: Record<string, any> = {
            id: identity.user.id, displayName: identity.user.displayName, role
        };
        const token = signToken(tokenPayload);

        return c.json(
            {
                token,
                id: identity.user.id,
                email: email,
                displayName: identity.user.displayName,
                role,
            },
            { status: 200 }
        );
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
});

loginRouter.post("/guest", async (c) => {
    try {
        const { displayName } = await c.req.json();

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return c.json({ error: "jwt configuration is missing" }, 500);
        }

        if (!displayName) {
            return c.json({ error: "missing displayName" }, 400);
        }

        let role: Role = 'guest';
        let tokenPayload: Record<string, any> = {
            id: uuidv4(), displayName, role
        };
        const token = signToken(tokenPayload);

        return c.json(
            {
                token,
                id: tokenPayload.id,
                email: null,
                displayName: displayName,
                role,
            },
            { status: 200 }
        );
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
});


loginRouter.post("/jira", async (c) => {
    try {
        const { email } = await c.req.json();

        if (!email) {
            return c.json({ error: "missing email" }, 400);
        }

        // 1. JIRA 認証
        let jiraInfo;
        try {
            jiraInfo = await authenticateWithJira(email);
        } catch {
            return c.json({ error: "failed to authenticate with jira" }, 401);
        }

        // 2. User upsert
        const userDB = await upsertUser(
            email,
            jiraInfo.displayName
        );

        // 3. Identity upsert
        await upsertJiraIdentity(
            userDB.id,
            jiraInfo.jira.userKey
        );

        const role: Role = 'viewer';
        let tokenPayload: Record<string, any> = {
            id: userDB.id, displayName: userDB.displayName, role
        };
        const token = signToken(tokenPayload);

        return c.json(
            {
                token,
                id: userDB.id,
                email: email,
                displayName: userDB.displayName,
                role,
            },
            { status: 200 }
        );
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
});


async function authenticateWithJira(email: string) {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL!;
    const res = await fetch(`${base}/rest/api/2/user/search?username=${email}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.JIRA_API_TOKEN!}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

    if (!res.ok) throw new Error("Cannot get Jira info");

    const users = await res.json();
    if (!users?.length) throw new Error("User not found in Jira");

    const user = users[0];
    return {
        displayName: user.displayName || email,
        jira: {
            userKey: user.key,
        },
    };
}

async function upsertJiraIdentity(userId: string, accountId: string) {
    return prisma.identity.upsert({
        where: {
            provider_providerUid: {
                provider: 'jira',
                providerUid: accountId,
            }
        },
        update: { userId },
        create: {
            userId,
            provider: 'jira',
            providerUid: accountId,
        },
    });
}

async function upsertUser(email: string, displayName: string) {
    return prisma.user.upsert({
        where: { email },
        update: { displayName },
        create: { email, displayName },
    });
}
