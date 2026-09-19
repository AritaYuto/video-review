"use client";

import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";

export function MaintenanceSection() {
    const t = useTranslations("admin-settings");

    return (
        <AdminSection title={t("sections.maintenance")}>
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </AdminSection>
    );
}
