"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { env } from "@/lib/env";
import ComboBox from "@/components/controls/combo-box";
import { ControlRow } from "@/components/controls/control-row";
import { FormDialog } from "@/components/dialog/form-dialog";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";

async function downloadVideo(videoId: string, videoRevId: string, width?: number): Promise<void> {
    const res = await api.media.download.$get({
        query: { videoId, videoRevId, width: width ? String(width) : undefined },
    });

    if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("unauthorized");
    }
    if (!res.ok) {
        throw new Error("download failed");
    }

    const blob = await res.blob();
    const video = useVideoStore.getState().videos.find(x => x.id === videoId);
    const videoRev = useVideoStore.getState().revisions.find(x => x.id === videoRevId);
    const filename = video?.title + "_Rev" + videoRev?.revision + (width ? `_${width}p` : "") + ".mp4";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

export function VideoDownloadDialog({ videoId, videoRevId, open, onClose }: { videoId: string; videoRevId: string; open: boolean; onClose: () => void }) {
    const t = useTranslations("video-download");
    const [selectedResolution, setSelectedResolution] = useState<number | undefined>(undefined);
    const resolutions = useMemo(() => {
        const res: Record<string, number | undefined> = {};
        res["original"] = undefined;
        env.RESOLUTION_PRESETS.forEach((w) => {
            res[`${w}p`] = w;
        });
        return res;
    }, []);

    useEffect(() => {
        if (open) {
            setSelectedResolution(undefined);
        }
    }, [open])

    const handleDownload = async () => {
        await downloadVideo(videoId, videoRevId, selectedResolution);
        onClose();
    };

    return (
        <FormDialog open={open} onClose={onClose} title={t("title")} onSubmit={handleDownload} cancelLabel={t("cancel")} submitLabel={t("prepare")}>
                    {ControlRow(t("selectRes"), () => {
                        return (
                            <ComboBox
                                options={Object.entries(resolutions).map(([label, value]) => ({ label, value }))}
                                setValue={(value) => setSelectedResolution(value)}
                                value={selectedResolution}
                                placeholder="resolution..." />
                        );
                    })}
        </FormDialog>
    );
}

