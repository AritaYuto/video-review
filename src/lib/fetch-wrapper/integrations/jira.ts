import { useAuthStore } from "@/stores/auth-store";

export async function createJiraIssue(
    commentId: string,
    reporterEmail: string,
    issueType: string,
    screenshot: Blob | null,
) {
    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("commentId", commentId);
    form.append("issueType", issueType);
    form.append("reporterEmail", reporterEmail);
    if (screenshot) {
        form.append("file", new File([screenshot], "screenshot.png"));
    }

    const res = await fetch("/api/v1/integrations/jira/create", {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if(res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("unauthorized");
    }

    if (!res.ok) throw new Error("Failed to update comment");

    const json = await res.json();
    return json.issueKey;
}
