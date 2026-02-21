import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

function spawnAsync(cmd: string, args: string[]) {
    return new Promise<void>((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: "inherit" });
        p.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} failed: ${code}`));
        });
    });
}

async function run() {
    const mode = process.argv[2];
    const venvDir = ".venv";
    const driver = process.env.VIDEO_ANALYSIS_DEVICE ?? "auto";
    const isWin = os.platform() === "win32";

    console.log(`Env: VIDEO_ANALYSIS_DEVICE=${driver}`);
    console.log(`Env: isWin=${isWin}`);

    const pythonPath = isWin
        ? path.join(".venv", "Scripts", "python.exe")
        : path.join(".venv", "bin", "python");

    const requirementsPath =
        driver === "cuda"
            ? "requirements_cuda.txt"
            : "requirements_cpu.txt";

    switch (mode) {
        case "setup": {
            if (!fs.existsSync(venvDir)) {
                console.log("Creating venv...");
                await spawnAsync("python", ["-m", "venv", venvDir]);
            }
            await spawnAsync(
                pythonPath,
                ["-m", "pip", "install", "-r", requirementsPath],
            );
            console.log("Setup completed.");
        }
        break;
        case "run": {
            // ---- run worker ----
            const worker = spawn(pythonPath, ["run_worker.py"], { stdio: "inherit" });
            worker.on("exit", (code) => {
                process.exit(code ?? 0);
            });
        }
        break;
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});