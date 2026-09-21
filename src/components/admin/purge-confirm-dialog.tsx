"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";

// Typed verbatim in every locale, so a translation can never soften the guard.
const CONFIRM_WORD = "Delete";

export function PurgeConfirmDialog({ title, busy, onConfirm, onCancel }: {
    title: string;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const t = useTranslations("admin-settings");
    const [typed, setTyped] = useState("");

    return (
        <Dialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("videos.trash.purge.title")}</DialogTitle>
                    <DialogDescription>
                        <span className="block">{t("videos.trash.purge.description", { title })}</span>
                        <span className="block">{t("videos.trash.purge.irreversible")}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2">
                    {/* Not a Label: it is select-none, and clicking one moves focus to the input,
                        so the word could not be selected and copied the way AWS and Grafana allow. */}
                    <p id="admin-purge-confirm-hint" className="text-sm font-medium">
                        {t.rich("videos.trash.purge.confirmLabel", {
                            confirmWord: CONFIRM_WORD,
                            word: (chunks) => (
                                <code className="select-all rounded bg-muted px-1 font-mono">{chunks}</code>
                            ),
                        })}
                    </p>
                    <Input
                        aria-labelledby="admin-purge-confirm-hint"
                        autoComplete="off"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={busy}>
                        {t("videos.trash.purge.cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={busy || typed !== CONFIRM_WORD}
                    >
                        {busy ? <Spinner /> : null}
                        {t("videos.trash.purge.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
