"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { useAvatarStore } from "@/stores/avatar-store";
import { uploadAvatar } from "@/lib/fetch-wrapper";
import { ControlRow } from "@/ui/control-row";
import { apiTokenRotate } from "@/lib/fetch-wrapper/admin";
import { Input } from "@/ui/input";
import { updateUser } from "@/lib/fetch-wrapper/user";

export default function EditUserProfileDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const MAX_SIZE = 1_000_000; // 1MB
    const t = useTranslations("edit-user-profile");
    const { setDisplayName, displayName, userId, email, role } = useAuthStore();

    const [editDisplayName, setEditDisplayName] = useState<string>(displayName ?? "");
    const [apiToken, setApiToken] = useState<string | null>(null);
    const { icon, fetchAvatar } = useAvatarStore();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!email) return;

        void (async () => {
            try {
                fetchAvatar(email);
            } catch { }
        })();
    }, [email])

    const previewUrl = useMemo(() => {
        if (!email) {
            return undefined;
        }
        if (file) {
            return URL.createObjectURL(file);
        }
        return icon(email);
    }, [file, email]);

    const onSubmit = async () => {
        try {
            const errorMsg = []
            setLoading(true);
            setError(null);
            if (file && email) {
                const result = await uploadAvatar({ email, file });
                if(!result.ok) {
                    errorMsg.push(result.msg);
                }
            }

            const result = await updateUser({ userId: userId ?? undefined, displayName: editDisplayName })
            if(result.ok) {
                setDisplayName(editDisplayName);
            } else {
                errorMsg.push(result.msg);
            }

            if(errorMsg.length > 0) {
                setError(t("saveFailed") + ":\n" + errorMsg.join("\n"));
                return;
            }
            Close();
        } finally {
            setApiToken("");
            setDisplayName(editDisplayName);
            setLoading(false);
        }
    };

    async function onRotateApiToken() {
        setError(null);

        try {
            const res = await apiTokenRotate();
            if (res.ok) {
                setApiToken(res.data);
            }
        } catch {
            setError(t("rotateFailed"));
        }
    }

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

    const Close = () => {
        setApiToken("");
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={Close}>
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
                                {displayName}
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

                    {ControlRow(t("displayName"), () => {
                        return (
                            <Input id="displayName"
                                type="text"
                                value={editDisplayName ?? ""}
                                onChange={(x) => setEditDisplayName(x.target.value)}
                                className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                        );
                    })}

                    <div>
                        {ControlRow(t("apiToken"), () => {
                            return (
                                <div className="flex justify-between">
                                    <Button
                                        variant="destructive"
                                        onClick={onRotateApiToken}
                                        disabled={loading}
                                        className="w-full"
                                    >
                                        {t("rotateApiToken")}
                                    </Button>
                                </div>

                            );
                        }, role !== "admin")}
                        <div>
                            {apiToken && (
                                <div className="mt-3 w-full rounded bg-black/40 p-2 text-xs text-white break-all">
                                    {apiToken}
                                </div>
                            )}
                        </div>
                    </div>
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
                    >
                        {loading ? t("saving") : t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
