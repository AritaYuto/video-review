"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { useTranslations } from "next-intl";
import { uploadAvatar } from "@/lib/fetch-wrapper";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";

export default function EditUserProfileDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const MAX_SIZE = 1_000_000; // 1MB
    const t = useTranslations("edit-user-profile");
    const email = useAuthStore((s) => s.email);
    const name = useAuthStore((s) => s.displayName);
    const currentAvatarUrl = `/api/v1/avatar?email=${email}`;

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previewUrl = useMemo(() => {
        if (file) {
            return URL.createObjectURL(file);
        }
        return currentAvatarUrl;
    }, [file, currentAvatarUrl]);

    const onSubmit = async () => {
        if (!file || !email) return;

        try {
            setLoading(true);
            setError(null);
            await uploadAvatar({ email, file });
            onClose();
        } catch {
            setError(t("saveFailed"));
        } finally {
            setLoading(false);
        }
    };


    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;

        if (f.size > MAX_SIZE) {
            setError(t("fileTooLarge", { size: f.size }));
            return;
        }

        setError(null);
        setFile(f);
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-[#202020]">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">
                        {t("title")}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {/* Avatar preview */}
                    <label className="relative cursor-pointer group">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={previewUrl} />
                            <AvatarFallback>
                                {name}
                            </AvatarFallback>
                        </Avatar>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center
                        rounded-full bg-black/50 opacity-0
                        group-hover:opacity-100 transition">
                            <span className="text-xs text-white">
                                {t("change")}
                            </span>
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            className="hidden"
                        />
                    </label>

                    {/* Hint */}
                    <div className="text-xs text-muted-foreground text-center">
                        {t("avatarHint", { max: "1MB", size: "256x256" })}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-400">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={!file || loading}
                    >
                        {loading ? t("saving") : t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
