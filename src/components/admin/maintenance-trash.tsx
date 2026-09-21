"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { InferResponseType } from "hono/client";
import { useLocale } from "@/app/locale-provider";
import { api, readError } from "@/lib/api-client";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Spinner } from "@/ui/spinner";

type TrashVideo = InferResponseType<typeof api.admin.maintenance.trash.$get, 200>["videos"][number];

// Renders as a fragment: the search field and the list are laid out by the AdminSection flex column.
export function MaintenanceTrash() {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();

    const [videos, setVideos] = useState<TrashVideo[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        let cancelled = false;
        api.admin.maintenance.trash.$get()
            .then(async res => {
                if (res.status !== 200) throw new Error(await readError(res));
                return (await res.json()).videos;
            })
            .then(rows => { if (!cancelled) setVideos(rows); })
            .catch(e => { if (!cancelled) setError(`${t("maintenance.trash.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`); });
        return () => { cancelled = true; };
    }, []);

    // Runs before the early returns below so the hook order stays stable.
    const shown = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        if (!videos) return [];
        if (!needle) return videos;
        return videos.filter(v =>
            v.title.toLowerCase().includes(needle) || v.folderKey.toLowerCase().includes(needle));
    }, [videos, filter]);

    if (error) {
        return <p className="shrink-0 text-sm text-destructive">{error}</p>;
    }

    if (videos === null) {
        return <div className="shrink-0"><Spinner /></div>;
    }

    return (
        <>
            <div className="shrink-0">
                <SidebarSearchInput
                    value={filter}
                    onChange={setFilter}
                    placeholder={t("maintenance.trash.filterPlaceholder")}
                />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {shown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {videos.length === 0 ? t("maintenance.trash.empty") : t("maintenance.trash.noMatch")}
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("maintenance.trash.columns.title")}</TableHead>
                                <TableHead>{t("maintenance.trash.columns.folder")}</TableHead>
                                <TableHead>{t("maintenance.trash.columns.updatedAt")}</TableHead>
                                <TableHead>{t("maintenance.trash.columns.revisions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shown.map(video => (
                                <TableRow key={video.id}>
                                    <TableCell>{video.title}</TableCell>
                                    <TableCell>{video.folderKey}</TableCell>
                                    <TableCell>{new Date(video.latestUpdatedAt).toLocaleDateString(locale)}</TableCell>
                                    <TableCell>{video.revisions.length}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </>
    );
}
