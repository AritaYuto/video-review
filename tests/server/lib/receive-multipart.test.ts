import { describe, expect, it, vi } from "vitest";

import { receiveMultipart } from "@/server/lib/utils/receive-multipart";

function requestWithFailingBody() {
    const body = new ReadableStream({
        start(controller) {
            controller.error(new Error("connection reset"));
        },
    });

    return new Request("http://localhost/", {
        method: "PUT",
        body,
        headers: { "content-type": "multipart/form-data; boundary=receive-multipart-test" },
        // @ts-expect-error duplex is required for a streamed body but missing from the DOM types
        duplex: "half",
    });
}

describe("receiveMultipart", () => {
    it("answers with 500 when the body stream breaks instead of leaving the request open", async () => {
        const onUploadProcess = vi.fn();

        const res = await receiveMultipart(requestWithFailingBody(), onUploadProcess);

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({ error: "Upload failed" });
        expect(onUploadProcess).not.toHaveBeenCalled();
    });
});
