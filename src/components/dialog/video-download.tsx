"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { env } from "@/lib/env";
import ComboBox from "@/components/controls/combo-box";
import { ControlRow } from "@/components/controls/control-row";
import { FormDialog } from "@/components/dialog/form-dialog";
import { downloadVideo } from "@/lib/fetch-wrapper";

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

