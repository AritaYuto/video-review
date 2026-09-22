"use client";

import { Fragment, useEffect, useMemo, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { InferResponseType } from "hono/client";
import { useLocale } from "@/app/locale-provider";
import { api, readError } from "@/lib/api-client";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { DeleteConfirmDialog, type DeleteTarget } from "@/components/admin/delete-confirm-dialog";
import { Spinner } from "@/ui/spinner";

type VideoRow = InferResponseType<typeof api.videos.index.$get, 200>[number];

// The library can hold thousands of videos; the filter is how you reach the rest.
const LIMIT = 100;
const FILTER_DEBOUNCE_MS = 300;

// Ties the disclosure button to the child rows it reveals.
const revisionRowId = (videoId: string, revision: number) => `video-${videoId}-rev-${revision}`;

// Renders as a fragment: the search field and the list are laid out by the AdminSection flex column.
export function VideosTable() {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();

    const [videos, setVideos] = useState<VideoRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
    const [target, setTarget] = useState<DeleteTarget | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            setError(null);
            api.videos.index.$get({
                query: {
                    includeRevisions: "true",
                    limit: String(LIMIT),
                    ...(filter.trim() ? { filterTree: filter.trim() } : {}),
                },
            })
                .then(async res => {
                    if (res.status !== 200) throw new Error(await readError(res));
                    return await res.json();
                })
                .then(rows => { if (!cancelled) setVideos(rows); })
                .catch(e => { if (!cancelled) setError(`${t("videos.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`); });
        }, videos === null ? 0 : FILTER_DEBOUNCE_MS);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [filter, reloadToken]);

    function toggleExpanded(videoId: string) {
        setExpanded(open => {
            const next = new Set(open);

            if (next.has(videoId)) next.delete(videoId);
            else next.add(videoId);

            return next;
        });
    }

    async function onDelete(target: DeleteTarget) {
        setDeleting(true);
        setActionError(null);

        let filesLeft = false;
        let failure: string | null = null;

        // Purging the last revision is what hides the video, so the client decides nothing.
        try {
            // Nothing to purge, so nothing would hide it: an orphan record needs the flag directly.
            // The route parses deleted as a string ("true" | anything else).
            if (target.whole && target.revisions.length === 0) {
                const res = await api.admin.maintenance.video.delete.$post({
                    json: { videoId: target.videoId, deleted: "true" },
                });
                if (res.status !== 200) throw new Error(await readError(res));
            }

            for (const revision of target.revisions) {
                const res = await api.admin.maintenance.video.purge.$post({
                    json: { videoId: target.videoId, revision: String(revision) },
                });

                // Partial success (HTTP 207) means the revision row is gone but its file survived:
                // worth reporting, not worth aborting. A missing revision (HTTP 404) means another
                // admin purged it first, which is the outcome we wanted anyway.
                if (![200, 207, 404].includes(res.status)) throw new Error(await readError(res));
                if (res.status === 207) filesLeft = true;
            }
        } catch (e) {
            failure = `${t("videos.delete.failed")}: ${e instanceof Error ? e.message : String(e)}`;
        }

        // Close first: the error is unreadable behind the modal.
        setTarget(null);
        setDeleting(false);

        // Both can be true at once, and orphaned files must not be hidden by the failure.
        const warning = filesLeft ? t("videos.delete.filesLeft") : null;
        setActionError([failure, warning].filter(Boolean).join(" ") || null);

        // Refetch: a hidden video leaves the list and a purged revision leaves its parent.
        setReloadToken(token => token + 1);
    }

    const atLimit = useMemo(() => videos !== null && videos.length >= LIMIT, [videos]);

    if (error) {
        return <p className="shrink-0 text-sm text-destructive">{error}</p>;
    }

    return (
        <>
            <div className="shrink-0">
                <SidebarSearchInput
                    value={filter}
                    onChange={setFilter}
                    placeholder={t("videos.filterPlaceholder")}
                />
            </div>

            {atLimit && (
                <p className="shrink-0 text-xs text-muted-foreground">{t("videos.limited", { limit: LIMIT })}</p>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto">
                {videos === null ? (
                    <Spinner />
                ) : videos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("videos.noMatch")}</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-9">
                                    <span className="sr-only">{t("videos.columns.expand")}</span>
                                </TableHead>
                                <TableHead>{t("videos.columns.title")}</TableHead>
                                <TableHead>{t("videos.columns.folder")}</TableHead>
                                <TableHead>{t("videos.columns.updatedAt")}</TableHead>
                                <TableHead>{t("videos.columns.revisions")}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{t("videos.columns.actions")}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {videos.map(video => (
                                <Fragment key={video.id}>
                                    <TableRow>
                                        <TableCell>
                                            {(video.revisions?.length ?? 0) > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleExpanded(video.id)}
                                                    aria-expanded={expanded.has(video.id)}
                                                    aria-controls={(video.revisions ?? []).map(r => revisionRowId(video.id, r.revision)).join(" ")}
                                                    aria-label={t("videos.toggleRevisions", { title: video.title })}
                                                >
                                                    {expanded.has(video.id) ? <ChevronDown /> : <ChevronRight />}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>{video.title}</TableCell>
                                        <TableCell>{video.folderKey}</TableCell>
                                        <TableCell>{new Date(video.latestUpdatedAt).toLocaleDateString(locale)}</TableCell>
                                        <TableCell>{video.revisions?.length ?? 0}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                {/* The video's own delete reaches every revision below it. */}
                                                <IconAction
                                                    icon={Trash2}
                                                    tooltip={t("videos.delete.action")}
                                                    label={t("videos.delete.wholeLabel", { title: video.title })}
                                                    onClick={() => {
                                                        setActionError(null);
                                                        setTarget({
                                                            videoId: video.id,
                                                            title: video.title,
                                                            revisions: (video.revisions ?? []).map(r => r.revision),
                                                            whole: true,
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {expanded.has(video.id) && (video.revisions ?? []).map(({ revision, uploadedAt }) => (
                                        <TableRow key={revision} id={revisionRowId(video.id, revision)}>
                                            <TableCell />
                                            <TableCell colSpan={4}>
                                                <span className="text-muted-foreground">
                                                    {t("videos.revisionRow", {
                                                        revision,
                                                        date: new Date(uploadedAt).toLocaleDateString(locale),
                                                    })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end">
                                                    <IconAction
                                                        icon={Trash2}
                                                        tooltip={t("videos.delete.action")}
                                                        label={t("videos.delete.revisionLabel", { revision, title: video.title })}
                                                        onClick={() => {
                                                            setActionError(null);
                                                            setTarget({
                                                                videoId: video.id,
                                                                title: video.title,
                                                                revisions: [revision],
                                                                whole: false,
                                                            });
                                                        }}
                                                    />
                                                </div>
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

            {target && (
                <DeleteConfirmDialog
                    target={target}
                    busy={deleting}
                    onConfirm={() => onDelete(target)}
                    onCancel={() => setTarget(null)}
                />
            )}
        </>
    );
}

// An icon carries the action, so the name it exposes has to say which row it belongs to.
function IconAction({ icon: Icon, tooltip, label, onClick }: {
    icon: ComponentType;
    tooltip: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" aria-label={label} onClick={onClick}>
                    <Icon />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
}
