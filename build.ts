import { execSync, exec } from "node:child_process";
import { mkdirSync, cpSync, rmSync } from "fs";
import path from "path";
import fs from "fs";

const content = fs.readFileSync("package.json") as any;
const productName = JSON.parse(content).name
let outBase: string | undefined = process.env.VIDEO_REVIEW_BUILD_OUTPUT_DIR;
if (!outBase) {
    outBase = undefined;
}

async function build() {
    mkdirSync("public", { recursive: true });
    execSync("npm install", { stdio: "inherit" });
    execSync("npm run prisma:generate", { stdio: "inherit" });
    execSync("next build", { stdio: "inherit" });
}

async function defaultBuild() {
    await build();
}

async function buildAndCopy(outDir: string) {
    // create output directories.
    mkdirSync(outDir, { recursive: true });

    await build();

    // copy
    cpSync("package.json", path.join(outDir, "package.json"));
    cpSync(".env", path.join(outDir, ".env"));
    cpSync("maintenance", path.join(outDir, "maintenance"), { recursive: true });
    cpSync(".next", path.join(outDir, ".next"), { recursive: true });
    cpSync("node_modules", path.join(outDir, "node_modules"), { recursive: true });
    cpSync("public", path.join(outDir, "public"), { recursive: true });
}

const main = async () => {
    if(!outBase) {
        console.log("Since VIDEO_REVIEW_BUILD_OUTPUT_DIR is not set, output will be directed to ProjectRoot.");
        defaultBuild();
    } else {
        const outDir = path.join(outBase, productName);
        buildAndCopy(outDir);
    }
    console.log(`\nsuccess build\n`);
};

main();
