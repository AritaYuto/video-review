"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/ui/input";
import { api } from "@/lib/api-client";
import { UploadTransferError, uploadToSession } from "@/lib/upload-transfer";
import { FormDialog } from "@/components/dialog/form-dialog";
import { Upload } from "lucide-react";
import path from "path";
import { useTranslations } from "next-intl";
import { UploadSession } from "@/lib/db-types";

const POLL_FAILURE_LIMIT = 3;

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
                const res = await api.videos.folders.$get();
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

            const initRes = await api.videos.upload.init.$post({ form: { title, folderKey: selectedFolderKey } });
            if (!initRes.ok) throw new Error("upload init failed");
            // The init route parses its multipart body by hand and declares no response schema.
            const init = (await initRes.json()) as { url: string; session: UploadSession };

            setSession(init.session);
            setStep("uploading");

            // Polling starts alongside the transfer; a rejected transfer has to stop it.
            await uploadToSession({
                url: init.url,
                session: init.session,
                file,
            });

        } catch (e) {
            setStep("error");
            setMessage(e instanceof UploadTransferError && e.status === 413
                ? t("errorUploadTooLarge")
                : t("errorUpload"));
        }
    };

    useEffect(() => {
        if (step !== "uploading" || !session) return;

        let cancelled = false;
        // A large upload is polled hundreds of times, so only a run of failures is a real one.
        let consecutiveFailures = 0;

        const timer = setInterval(async () => {
            try {
                const res = await api.uploadStatus.index.$get({ query: { session_id: session.id } });
                if (cancelled) return;

                // The session is gone and no revision was created, so nothing will ever complete.
                if (res.status === 404) {
                    setStep("error");
                    setMessage(t("errorUpload"));
                    return;
                }
                // The client resolves any other status instead of throwing.
                if (res.status !== 200) {
                    if (++consecutiveFailures >= POLL_FAILURE_LIMIT) {
                        setStep("error");
                        setMessage(t("errorUpload"));
                    }
                    return;
                }

                const { status } = await res.json();

                if (status === "uploaded") {
                    const finishRes = await api.videos.upload.finish.$post({ query: { session_id: session.id } });
                    if (cancelled) return;

                    if (!finishRes.ok) {
                        setStep("error");
                        setMessage(t("errorUpload"));
                        return;
                    }
                }

                if (status === "completed") {
                    setStep("done");
                    onClose();
                    return;
                }

                consecutiveFailures = 0;
            } catch {
                if (cancelled) return;

                if (++consecutiveFailures >= POLL_FAILURE_LIMIT) {
                    setStep("error");
                    setMessage(t("errorUpload"));
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

