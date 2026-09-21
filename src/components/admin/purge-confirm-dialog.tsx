"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Spinner } from "@/ui/spinner";

// Typed verbatim in every locale, so a translation can never soften the guard.
const CONFIRM_WORD = "Delete";

export function PurgeConfirmDialog({ title, revisions, busy, onConfirm, onCancel }: {
    title: string;
    revisions: number;
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
                    <DialogTitle>{t("maintenance.trash.purge.title")}</DialogTitle>
                    <DialogDescription>
                        {t("maintenance.trash.purge.description", { title, revisions })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2">
                    <Label htmlFor="admin-purge-confirm">
                        {t("maintenance.trash.purge.confirmLabel", { word: CONFIRM_WORD })}
                    </Label>
                    <Input
                        id="admin-purge-confirm"
                        autoComplete="off"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={busy}>
                        {t("maintenance.trash.purge.cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={busy || typed !== CONFIRM_WORD}
                    >
                        {busy ? <Spinner /> : null}
                        {t("maintenance.trash.purge.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
