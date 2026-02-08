"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/fetch-wrapper"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { useTranslations } from "next-intl";
import { PromptTemplate } from "@/lib/db-types";

import { Textarea } from "@/ui/textarea";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
import MultiComboBox from "@/ui/multi-combobox";

export default function PromptEditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("prompt-edit");

    const [loading, setLoading] = useState(false);
    const [keys, setKeys] = useState<string[]>([]);
    const [kinds, setKinds] = useState<string[]>([]);
    const [data, setData] = useState<PromptTemplate[]>([]);

    useEffect(() => {
        if (!open) return;
        setLoading(true);

        (async () => {
            try {
                const kindsRes = await api.getPromptKinds();
                if (kindsRes.ok) setKinds(kindsRes.data);

                const keysRes = await api.getPromptKeys();
                if (!keysRes.ok) return;

                const promptRes = await api.getPrompts();
                if (!promptRes.ok) return;

                const map = new Map(promptRes.data.map((x) => [x.key, x]));

                const editablePrompts = keysRes.data.map((key) => {
                    const existing = map.get(key);
                    if (existing) return existing;

                    return {
                        id: "",
                        key,
                        kinds: [],
                        prompt: "",
                    };
                });

                setData(editablePrompts);
                setKeys(keysRes.data);
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    useEffect(() => {
        console.log(data)
    }, [data])

    const handleChangePrompt = (key: string, value: string) => {
        setData((prev) =>
            prev.map((x) =>
                x.key === key ? { ...x, prompt: value } : x
            )
        );
    };

    const handleChangeKinds = (key: string, value: string[]) => {
        console.log("handleChangeKinds", key, value)
        setData((prev) =>
            prev.map((x) =>
                x.key === key ? { ...x, kinds: value } : x
            )
        );
    };

    const handleSave = async () => {
        await Promise.all(
            data.map((x) => api.updatePrompt(x))
        );
        onClose();
    };


    return (
        <Dialog open={open} onOpenChange={() => { onClose() }}>
            <DialogContent 
                style={{ scrollbarWidth: "thin", scrollbarColor: "#444 #181818" }}
                className="bg-[#202020] p-4 sm:max-w-5xl max-h-[85vh] grid-rows-[auto_1fr_auto] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 overflow-y-auto pr-1">
                    {loading ? (
                        <div className="text-sm text-muted-foreground">
                            Loading prompts...
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {data.map((x) => (
                                <div
                                    key={x.key}
                                    className="rounded-md border border-[#333] p-3 bg-[#1c1c1c]"
                                >
                                    {/* key + kinds */}
                                    <div className="grid grid-cols-[200px_1fr] items-center gap-3 mb-2">
                                        <Label className="text-[#ff8800] text-sm">
                                            {x.key}
                                        </Label>

                                        <MultiComboBox
                                            placeholder="Use metadata kinds"
                                            options={kinds}
                                            value={x.kinds}
                                            setValue={(v) => handleChangeKinds(x.key, v)}
                                        />
                                    </div>

                                    {/* prompt */}
                                    <Textarea
                                        value={x.prompt}
                                        onChange={(e) =>
                                            handleChangePrompt(x.key, e.target.value)
                                        }
                                        className="bg-[#222] border-[#333] text-white resize-y min-h-80"
                                        placeholder="Enter prompt template..."
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <div className="p-1 w-full">
                        <Button
                            onClick={() => handleSave()}
                            className="w-full bg-[#ff8800] hover:bg-[#ff9a1a] text-black font-semibold"
                        >
                            {t("save")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
