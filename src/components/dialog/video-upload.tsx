"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/ui/input";
import * as api from "@/lib/fetch-wrapper"
import { api as rpc } from "@/lib/api-client";
import { FormDialog } from "@/components/dialog/form-dialog";
import { Upload } from "lucide-react";
import path from "path";
import { useTranslations } from "next-intl";
import { UploadSession } from "@/lib/db-types";

export default function VideoUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    type UploadStep = "input" | "uploading" | "done" | "error";

    const t = useTranslations("video-upload");
    const [folderKeys, setFolderKeys] = useState<string[]>([]);
    const [selectedFolderKey, setSelectedFolderKey] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<UploadStep>("input");
    const [session, setSession] = useState<UploadSession | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        void (async () => {
            try {
                const res = await rpc.videos.folders.$get();
                if (res.status === 200) setFolderKeys(await res.json());
            } catch {

            }
        })();
    }, []);

    useEffect(() => {
        if (open) {
            setStep("input");
            setMessage("");
            setFile(null);
            setSelectedFolderKey("");
            setSession(null);
        }
    }, [open])

    const handleUpload = async () => {
        if (!selectedFolderKey || !file) {
            setMessage(t("errorNoInput"));
            return;
        }

        const title = path.parse(file.name).name;

        try {
            setMessage("");

            const init = await api.uploadVideoInit({
                title,
                folderKey: selectedFolderKey,
            });

            setSession(init.session);
            setStep("uploading");

            api.uploadVideo({
                url: init.url,
                session: init.session,
                file,
            });

        } catch {
            setStep("error");
            setMessage(t("errorUploadFailed"));
        }
    };

    useEffect(() => {
        if (step !== "uploading" || !session) return;

        let cancelled = false;

        const timer = setInterval(async () => {
            try {
                const res = await api.checkUploadStatus({
                    session_id: session.id,
                });

                if (cancelled) return;

                if (res.status === "uploaded") {
                    await api.uploadVideoFinish({
                        session_id: session.id,
                    });
                }

                if (res.status === "completed") {
                    setStep("done");
                    onClose();
                    return;
                }
            } catch (e: any) {
                if (e?.status === 404) {
                    setStep("error");
                    setMessage(t("errorUploadFailed"));
                    return;
                }
            }
        }, 1500);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [step, session]);

    return (
        <FormDialog
            open={open}
            onClose={() => { if (step !== "done") onClose(); }}
            title={t("title")}
            onSubmit={handleUpload}
            cancelLabel={t("cancel")}
            submitLabel={step === "uploading" ? t("uploading") : t("upload")}
            cancelDisabled={step === "uploading"}
            submitDisabled={!file || step !== "input"}
            message={message}
        >
                <div className="flex flex-col gap-3">
                    <label
                        htmlFor="video-file"
                        className="flex items-center justify-between w-full p-2 rounded-md bg-muted border border-input cursor-pointer hover:bg-accent"
                    >
                        <span className="text-muted-foreground">
                            {file ? file.name : t("selectFile")}
                        </span>
                        <input
                            id="video-file"
                            type="file"
                            accept="video/mp4"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="hidden"
                        />
                        <Upload size={16} className="text-muted-foreground" />
                    </label>

                    <Input
                        type="text"
                        list="folder-key-options"
                        placeholder={t("folderKeyPlaceholder")}
                        value={selectedFolderKey}
                        onChange={(e) => setSelectedFolderKey(e.target.value)}
                    />

                    <datalist id="folder-key-options">
                        {folderKeys.map((key) => (
                            <option key={key} value={key} />
                        ))}
                    </datalist>
                </div>
        </FormDialog>
    );
}

