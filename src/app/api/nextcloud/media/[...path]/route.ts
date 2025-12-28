import { apiError } from "@/lib/api-response";
import { nextCloudClient } from "@/lib/nextcloud";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathSegments } = await params;

    if (pathSegments.some(p => p.includes(".."))) {
        return apiError("invalid path", 400);
    }

    if (!nextCloudClient) {
        return apiError("Nextcloud client not configured", 500);
    }

    const ncPath = pathSegments.join("/");
    const ncUrl = nextCloudClient.pathUnderRoot(ncPath);
    const range = req.headers.get("range");
    const res = await fetch(ncUrl, {
        method: "GET",
        headers: {
            ...nextCloudClient.getHeaders(),
            ...(range ? { Range: range } : {}),
        },
    });

    if (!res.ok || !res.body) {
        return apiError("failed to fetch media", res.status);
    }

    const headers = new Headers();
    res.headers.forEach((value, key) => {
        headers.set(key, value);
    });

    return new Response(res.body, {
        status: res.status,
        headers,
    });
}
