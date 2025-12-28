import { Hono } from "hono";
import fs from "fs";
import path from "path";

export const mediaRouter = new Hono();

mediaRouter.get('/:path{.*}', async (c) => {
    const relativePath = c.req.param('path'); 
    const filePath = path.join(process.cwd(), "uploads", relativePath);
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === ".mp4") {
            const stat = await fs.promises.stat(filePath);
            const fileSize = stat.size;
            const range = c.req.header("range");

            if (!range) {
                const file = await fs.promises.readFile(filePath);
                return c.body(file, 200, {
                    "Content-Type": "video/mp4",
                    "Content-Length": fileSize.toString(),
                });
            }

            const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

            const stream = fs.createReadStream(filePath, { start, end });
            return c.body(stream as any, 206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": (end - start + 1).toString(),
                "Content-Type": "video/mp4",
            });
        }

        // image fallback
        const data = await fs.promises.readFile(filePath);
        return c.body(data, 200);
    } catch (err: any) {
        if (err?.code === "ENOENT") {
            return c.text("Not found", 404);
        }
        return c.text("Internal error", 500);
    }
});
