"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { InferResponseType } from "hono/client";
import { useLocale } from "@/app/locale-provider";
import { api, readError } from "@/lib/api-client";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Button } from "@/ui/button";
import { PurgeConfirmDialog } from "@/components/admin/purge-confirm-dialog";
import { Spinner } from "@/ui/spinner";

type TrashVideo = InferResponseType<typeof api.admin.maintenance.trash.$get, 200>["videos"][number];

// Ties the disclosure button to the child rows it reveals.
const revisionRowId = (videoId: string, revision: number) => `trash-${videoId}-rev-${revision}`;

// Renders as a fragment: the search field and the list are laid out by the AdminSection flex column.
export function VideosTrash() {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();

    const [videos, setVideos] = useState<TrashVideo[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [purgeTarget, setPurgeTarget] = useState<TrashVideo | null>(null);
    const [purging, setPurging] = useState(false);
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

    useEffect(() => {
        let cancelled = false;

        api.admin.maintenance.trash.$get()
            .then(async res => {
                if (res.status !== 200) throw new Error(await readError(res));
                return (await res.json()).videos;
            })
            .then(rows => { if (!cancelled) setVideos(rows); })
            .catch(e => { if (!cancelled) setError(`${t("videos.trash.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`); });

        return () => { cancelled = true; };
    }, []);

    async function onRestore(video: TrashVideo) {
        setRestoringId(video.id);
        setActionError(null);

        try {
            // The route parses deleted as a string ("true" | anything else).
            const res = await api.admin.maintenance.video.delete.$post({ json: { videoId: video.id, deleted: "false" } });
            if (res.status !== 200) throw new Error(await readError(res));

            setVideos(rows => rows?.filter(r => r.id !== video.id) ?? null);
            collapse(video.id);
        } catch (e) {
            setActionError(`${t("videos.trash.restoreFailed")}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setRestoringId(null);
        }
    }

    async function onPurge(video: TrashVideo) {
        setPurging(true);
        setActionError(null);

        // purge deletes one revision at a time, so a whole video is the sum of its revisions.
        const purged = new Set<number>();
        let filesLeft = false;
        let failure: string | null = null;

        try {
            for (const { revision } of video.revisions) {
                const res = await api.admin.maintenance.video.purge.$post({
                    json: { videoId: video.id, revision: String(revision) },
                });

                // Partial success (HTTP 207) means the revision row is gone but its file survived:
                // worth reporting, not worth aborting. A missing revision (HTTP 404) means another
                // admin purged it first, which is the outcome we wanted anyway.
                if (![200, 207, 404].includes(res.status)) throw new Error(await readError(res));
                if (res.status === 207) filesLeft = true;

                purged.add(revision);
            }

            // A missing video (HTTP 404) means another admin got there first: same outcome.
            const res = await api.admin.maintenance.video.destroy.$post({ json: { videoId: video.id } });
            if (![200, 404].includes(res.status)) throw new Error(await readError(res));

            setVideos(rows => rows?.filter(r => r.id !== video.id) ?? null);
            collapse(video.id);
        } catch (e) {
            failure = `${t("videos.trash.purge.failed")}: ${e instanceof Error ? e.message : String(e)}`;

            // Drop only what went through, so a retry resumes where it stopped.
            setVideos(rows => rows?.map(r =>
                r.id === video.id ? { ...r, revisions: r.revisions.filter(n => !purged.has(n.revision)) } : r) ?? null);
        }

        // Close first: the error is unreadable behind the modal.
        setPurgeTarget(null);
        setPurging(false);

        // Both can be true at once, and orphaned files must not be hidden by the failure.
        const warning = filesLeft ? t("videos.trash.purge.filesLeft", { title: video.title }) : null;
        setActionError([failure, warning].filter(Boolean).join(" ") || null);
    }

    // Runs before the early returns below so the hook order stays stable.
    const shown = useMemo(() => {
        const needle = filter.trim().toLowerCase();

        if (!videos) return [];
        if (!needle) return videos;

        return videos.filter(v =>
            v.title.toLowerCase().includes(needle) || v.folderKey.toLowerCase().includes(needle));
    }, [videos, filter]);

    function collapse(videoId: string) {
        setExpanded(open => {
            if (!open.has(videoId)) return open;
            const next = new Set(open);
            next.delete(videoId);
            return next;
        });
    }

    function toggleExpanded(videoId: string) {
        setExpanded(open => {
            const next = new Set(open);
            if (next.has(videoId)) next.delete(videoId);
            else next.add(videoId);
            return next;
        });
    }

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
                    placeholder={t("videos.trash.filterPlaceholder")}
                />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {shown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {videos.length === 0 ? t("videos.trash.empty") : t("videos.trash.noMatch")}
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-9">
                                    <span className="sr-only">{t("videos.trash.columns.expand")}</span>
                                </TableHead>
                                <TableHead>{t("videos.trash.columns.title")}</TableHead>
                                <TableHead>{t("videos.trash.columns.folder")}</TableHead>
                                <TableHead>{t("videos.trash.columns.updatedAt")}</TableHead>
                                <TableHead>{t("videos.trash.columns.revisions")}</TableHead>
                                <TableHead><span className="sr-only">{t("videos.trash.columns.actions")}</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shown.map(video => (
                                <Fragment key={video.id}>
                                    <TableRow>
                                        <TableCell>
                                            {video.revisions.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleExpanded(video.id)}
                                                    aria-expanded={expanded.has(video.id)}
                                                    aria-controls={video.revisions.map(r => revisionRowId(video.id, r.revision)).join(" ")}
                                                    aria-label={t("videos.trash.toggleRevisions", { title: video.title })}
                                                >
                                                    {expanded.has(video.id) ? <ChevronDown /> : <ChevronRight />}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>{video.title}</TableCell>
                                        <TableCell>{video.folderKey}</TableCell>
                                        <TableCell>{new Date(video.latestUpdatedAt).toLocaleDateString(locale)}</TableCell>
                                        <TableCell>{video.revisions.length}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onRestore(video)}
                                                    disabled={restoringId === video.id}
                                                >
                                                    {restoringId === video.id ? <Spinner /> : null}
                                                    {t("videos.trash.restore")}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => { setActionError(null); setPurgeTarget(video); }}
                                                >
                                                    {t("videos.trash.purge.action")}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {/* What Delete takes with the video. One self-describing cell, so
                                        nothing lines up under a heading that means something else. */}
                                    {expanded.has(video.id) && video.revisions.map(({ revision, uploadedAt }) => (
                                        <TableRow key={revision} id={revisionRowId(video.id, revision)}>
                                            <TableCell />
                                            <TableCell colSpan={5}>
                                                <span className="text-muted-foreground">
                                                    {t("videos.trash.revisionRow", {
                                                        revision,
                                                        date: new Date(uploadedAt).toLocaleDateString(locale),
                                                    })}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {actionError && <p className="shrink-0 text-sm text-destructive">{actionError}</p>}

            {purgeTarget && (
                <PurgeConfirmDialog
                    title={purgeTarget.title}
                    busy={purging}
                    onConfirm={() => onPurge(purgeTarget)}
                    onCancel={() => setPurgeTarget(null)}
                />
            )}
        </>
    );
}
