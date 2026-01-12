export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | null> {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL;
    const token = process.env.JIRA_API_TOKEN;

    if (!base || !token) {
        return null;
    }

    const infoRes = await fetch(
        `${base}/rest/api/2/user/avatars?username=${email}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );

    if (!infoRes.ok) {
        return null;
    }

    const info = await infoRes.json();
    const latest =
        info.custom?.find((a: any) => a.isSelected) ??
        info.system?.find((a: any) => a.isSelected);

    if (!latest || !latest.owner) {
        return null;
    }

    const avatarUrl = `${base}/secure/useravatar?ownerId=${latest.owner}&avatarId=${latest.id}`;
    const imgRes = await fetch(avatarUrl, {headers: { Authorization: `Bearer ${token}` }});

    if (!imgRes.ok) {
        return null;
    }
    return Buffer.from(await imgRes.arrayBuffer());
}