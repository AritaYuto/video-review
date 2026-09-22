"use client";

import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";
import { VideosTable } from "@/components/admin/videos-table";

export function VideosSection() {
    const t = useTranslations("admin-settings");

    return (
        <AdminSection title={t("sections.videos")}>
            <VideosTable />
        </AdminSection>
    );
}
