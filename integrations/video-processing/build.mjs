import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const cwd = process.cwd();
const outdir = path.join(cwd, "dist");

if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true, force: true });
}

await build({
  entryPoints: {
    "main-local": path.join(cwd, "main-local.ts"),
    "main-lambda": path.join(cwd, "main-lambda.ts"),
  },
  outdir,
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node20"],
  sourcemap: false,
    tsconfig: path.join(cwd, "tsconfig.json"),
    external: [
        "@prisma/client",
        "@aws-sdk/client-s3",
        "@aws-sdk/s3-request-presigner",
        "mime-types",
        "uuid",
    ],
    logLevel: "info",
});
