"use client";

import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";

export function UsersSection() {
    const t = useTranslations("admin-settings");

    return (
        <AdminSection title={t("sections.users")}>
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </AdminSection>
    );
}
