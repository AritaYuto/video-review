"use client";

import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";
import { VideosTrash } from "@/components/admin/videos-trash";

export function VideosSection() {
    const t = useTranslations("admin-settings");

    return (
        <AdminSection title={t("sections.videos")}>
            <VideosTrash />
        </AdminSection>
    );
}
