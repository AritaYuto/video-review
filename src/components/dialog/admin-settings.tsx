"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import { isAdmin } from "@/lib/role";
import { UsersSection } from "@/components/admin/users-section";
import { ApiTokenSection } from "@/components/admin/api-token-section";
import { IntegrationsSection } from "@/components/admin/integrations-section";
import { VideosSection } from "@/components/admin/videos-section";

// Add a section by appending here.
const SECTIONS = [
    { key: "users", label: "sections.users", Component: UsersSection },
    { key: "apiToken", label: "sections.apiToken", Component: ApiTokenSection },
    { key: "integrations", label: "sections.integrations", Component: IntegrationsSection },
    { key: "videos", label: "sections.videos", Component: VideosSection },
] as const;

export default function AdminSettingsDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const t = useTranslations("admin-settings");
    const { role } = useAuthStore();
    const [section, setSection] = useState<string>(SECTIONS[0].key);

    // Belt and braces: the popover gates the entry, the server gates the routes.
    if (!isAdmin(role)) return null;

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-5xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                {/* min-w-0: without it this grid item grows to its content and the sections overflow the dialog. */}
                <Tabs orientation="vertical" value={section} onValueChange={setSection} className="flex-row min-w-0">
                    <TabsList className="flex-col h-auto w-44 mr-4 shrink-0 self-start items-stretch">
                        {SECTIONS.map(({ key, label }) => (
                            <TabsTrigger key={key} value={key} className="justify-start">
                                {t(label)}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Fixed height so switching sections doesn't resize the dialog; each section scrolls its own content. */}
                    {SECTIONS.map(({ key, Component }) => (
                        <TabsContent key={key} value={key} className="min-w-0 flex-1 h-120">
                            <Component />
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
