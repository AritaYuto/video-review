"use client";

import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";

export function ApiTokenSection() {
    const t = useTranslations("admin-settings");

    return (
        <AdminSection title={t("sections.apiToken")}>
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </AdminSection>
    );
}
