import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const USERS = [
    {
        displayName: "Bocchi",
        email: "Bocchi@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Bocchi.png",
        role: "admin"
    },
    {
        displayName: "Kita",
        email: "Kita@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Kita.png",
        role: "admin"
    },
    {
        displayName: "Ryo",
        email: "Ryo@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Ryo.png",
        role: "admin"
    },
    {
        displayName: "Nijika",
        email: "Nijika@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Nijika.png",
        role: "admin"
    },
];

const FOLDERS = [
    "01_prototype",
    "02_core_loop",
    "03_battle",
    "04_boss",
    "05_cutscene",
    "06_ui",
    "07_tutorial",
    "08_event",
    "09_debug",
    "10_release_candidate",
];

const COMMENT_TEMPLATES = [
    { user: 0, text: "Um… this cut might be a little fast… or maybe it's just me." },
    { user: 1, text: "This part is really cool! The timing around 2.3s just feels a bit tight though." },
    { user: 2, text: "The cut happens slightly before the motion settles." },
    { user: 0, text: "If it's not too much trouble, maybe easing the transition could help." },
//  { user: 3, text: "Let's apply the timing fix and move on to the next pass." }
];

function pick<T>(arr: T[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedUsers() {
    const users = [];

    for (const u of USERS) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                displayName: u.displayName,
                avatarPath: u.avatarPath,
                role: u.role,
                identities: {
                    create: {
                        provider: "password",
                        providerUid: u.email,
                        secretHash: await bcrypt.hash(u.pass, 10),
                    }
                }
            },
        });
        users.push(user);
    }
    return users;
}

async function seedRevision(videoId: string) {
    await prisma.videoRevision.create({
        data: {
            videoId,
            revision: 1,
            filePath: `videos/demo/rev_001.mp4`,
        },
    });
}

async function seedComments(videoId: string, users: User[]) {
    let t = 1.0;
    if (Math.random() < 0.6) return [];

    const comments = [];
    for (let i = 0; i < COMMENT_TEMPLATES.length; i++) {
        const tpl = COMMENT_TEMPLATES[i];
        const user = users[tpl.user];

        comments.push(await prisma.videoComment.create({
            data: {
                videoId,
                videoRevNum: 1,
                userName: user.displayName,
                userEmail: user.email ?? "",
                comment: tpl.text,
                time: t,
                drawingPath: (Math.random() < 0.7 && i === 2) ? "/drawings/sample.png" : null,
                issueId: (Math.random() < 0.7 && i === 1) ? "ISSUE-123" : null,
                thumbsUp: (Math.random() < 0.7 && i === 4) ? 2 : 0,
            },
        }));
        t += 8.0;
    }
    return comments;
}

async function seedReadStatus(
    userId: string,
    videoId: string,
    comments: { id: string }[],
) {
    if (comments.length === 0) return;
    if (Math.random() < 0.3) return;

    const lastRead =
        comments[comments.length -1];

    await prisma.userVideoReadStatus.create({
        data: {
            userId,
            videoId,
            lastReadCommentId: lastRead.id,
        },
    });
}

async function createBatch(
    count: number,
    opts: {
        daysAgoMax: number;
        deletedRate?: number;
        sceneRate?: number;
        titlePrefix: string;
    },
    users: User[]
) {
    for (let i = 0; i < count; i++) {
        const video = await prisma.video.create({
            data: {
                title: `${opts.titlePrefix} #${String(i + 1).padStart(3, "0")}`,
                folderKey: pick(FOLDERS),
                scenePath:
                    Math.random() < (opts.sceneRate ?? 0.4)
                        ? `videos/UnitySample/UnityDemo/rev_001.mp4`
                        : null,
                latestUpdatedAt: daysAgo(
                    Math.floor(Math.random() * opts.daysAgoMax)
                ),
                deleted: Math.random() < (opts.deletedRate ?? 0),
            },
        });

        await seedRevision(video.id);
        const comments = await seedComments(video.id, users);
  
        for (const user of users) {
            await seedReadStatus(user.id, video.id, comments);
        }
    }
}

async function main() {
    console.log("Seeding realistic project data...");
    const users = await seedUsers();

    await createBatch(40, {
        daysAgoMax: 7,
        sceneRate: 0.8,
        titlePrefix: "Gameplay Capture",
    }, users);

    await createBatch(160, {
        daysAgoMax: 30,
        sceneRate: 0.5,
        titlePrefix: "Feature Review",
    }, users);

    await createBatch(250, {
        daysAgoMax: 180,
        sceneRate: 0.2,
        titlePrefix: "Archived Playtest",
    }, users);

    await createBatch(50, {
        daysAgoMax: 90,
        deletedRate: 1,
        sceneRate: 0.1,
        titlePrefix: "Discarded",
    }, users);

    console.log("Done.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
