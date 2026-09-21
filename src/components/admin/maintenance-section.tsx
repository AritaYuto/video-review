"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { InferResponseType } from "hono/client";
import { api, readError } from "@/lib/api-client";
import { AdminSection } from "@/components/admin/admin-section";
import { MaintenanceTrash } from "@/components/admin/maintenance-trash";
import { Badge } from "@/ui/badge";
import { Spinner } from "@/ui/spinner";

type Status = InferResponseType<typeof api.admin.maintenance.status.$get, 200>;

const STATUS_KEYS = ["hasAdmin", "hasJwt", "initialized"] as const satisfies readonly (keyof Status)[];

export function MaintenanceSection() {
    const t = useTranslations("admin-settings");
    const [status, setStatus] = useState<Status | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.admin.maintenance.status.$get()
            .then(async res => {
                if (res.status !== 200) throw new Error(await readError(res));
                return await res.json();
            })
            .then(s => { if (!cancelled) setStatus(s); })
            .catch(e => { if (!cancelled) setError(`${t("maintenance.status.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`); });
        return () => { cancelled = true; };
    }, []);

    return (
        <AdminSection title={t("sections.maintenance")}>
            <h4 className="shrink-0 text-sm font-medium">{t("maintenance.status.title")}</h4>

            {error ? (
                <p className="shrink-0 text-sm text-destructive">{error}</p>
            ) : status === null ? (
                <div className="shrink-0"><Spinner /></div>
            ) : (
                <dl className="shrink-0 space-y-2">
                    {STATUS_KEYS.map(key => (
                        <div key={key} className="flex items-center justify-between gap-4">
                            <dt className="text-sm">{t(`maintenance.status.${key}`)}</dt>
                            <dd>
                                <Badge variant={status[key] ? "success" : "destructive"}>
                                    {status[key] ? t("maintenance.status.yes") : t("maintenance.status.no")}
                                </Badge>
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            <h4 className="shrink-0 text-sm font-medium border-t pt-3">{t("maintenance.trash.title")}</h4>
            <MaintenanceTrash />
        </AdminSection>
    );
}
