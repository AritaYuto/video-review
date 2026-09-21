"use client";

import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";
import { MaintenanceTrash } from "@/components/admin/maintenance-trash";

export function MaintenanceSection() {
    const t = useTranslations("admin-settings");

    return (
        <AdminSection title={t("sections.maintenance")}>
            <MaintenanceTrash />
        </AdminSection>
    );
}
