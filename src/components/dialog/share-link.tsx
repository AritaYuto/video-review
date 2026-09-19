"use client";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface ShareLinkDialogProps {
    url: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareLinkDialog({ url, open, onOpenChange }: ShareLinkDialogProps) {
    const t = useTranslations("share-link");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("helperText")}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <Input
                        value={url}
                        readOnly
                        className="select-all"
                        onFocus={(e) => e.target.select()}
                    />
                </div>

                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button>{t("close")}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
