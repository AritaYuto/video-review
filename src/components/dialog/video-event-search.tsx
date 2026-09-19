"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FormDialog } from "@/components/dialog/form-dialog";
import { ClearableComboBox, ClearableTextField } from "@/components/controls/clearable-fields";
import { ControlRow } from "@/components/controls/control-row";
import { useVideoEventSearchStore } from "@/stores/video-event-search-store";
import { Checkbox } from "@/ui/checkbox";
import { useVideoStore } from "@/stores/video-store";
import { fetchVideoEventKinds } from "@/lib/fetch-wrapper";
import { useVideoEventStore } from "@/stores/video-event-store";

export function VideoEventSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("video-event-search");
    const [eventKinds, setEventKinds] = useState<{ label: string, value: string }[]>([]);
    const { selectedRevision } = useVideoStore();
    const { fetchEvents } = useVideoEventStore();
    const {
        filterText,
        kind,
        hasLink,
        setFilterText,
        setKind,
        setHasLink,
    } = useVideoEventSearchStore();

    useEffect(() => {
        void (async () => {
            const items = await fetchVideoEventKinds();
            setEventKinds(items.map((item) => ({ label: item, value: item })));
        })();
    }, [open]);

    const handleSearch = () => {
        if (selectedRevision) {
            fetchEvents(selectedRevision);
        }
        onClose();
    }

    return (
        <FormDialog open={open} onClose={onClose} title={t("title")} onSubmit={handleSearch} cancelLabel={t("cancel")} submitLabel={t("ok")}>
                    {ControlRow(t("searchFilter"), () => {
                        return (
                            <ClearableTextField
                                value={filterText}
                                onChange={setFilterText}
                                onClear={() => setFilterText("")}
                                placeholder="Filter event text..." />
                        );
                    })}

                    {ControlRow(t("kind"), () => {
                        return (
                            <ClearableComboBox
                                options={eventKinds}
                                setValue={setKind}
                                value={kind}
                                placeholder="Select event kind..."
                                onClear={() => setKind("")} />
                        );
                    })}

                    {ControlRow(t("hasLink"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasLink}
                                onCheckedChange={(x) => { setHasLink(x as boolean) }}
                                size="lg"
                            />
                        );
                    })}
        </FormDialog>
    );
}
