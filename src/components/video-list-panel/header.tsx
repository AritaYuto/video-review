"use client";

import React from "react";
import { Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";
import { isGuest, isViewer } from "@/lib/role";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInput,
} from "@/ui/sidebar"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

export default function VideoListPanelHeader(
    { ref, onSearchDialogShow, onUploadDialogShow, filterText, onSetFilterText } 
: {
        ref: React.RefObject<HTMLDivElement | null>;
        onSearchDialogShow: () => void;
        onUploadDialogShow: () => void;
        filterText: string;
        onSetFilterText: (text: string) => void;
}) {
    const t = useTranslations("video-list-panel");
    const { role } = useAuthStore();
    return (
        <SidebarHeader
            ref={ref}
            style={{ color: "#ff8800" }}
            className="border-b p-3 font-semibold text-sm bg-[#181818] border-[#333]"
        >
            <div className="flex justify-between">
                <div>
                    <span>{t("title")}</span>
                    <button
                        hidden={isGuest(role)}
                        onClick={() => onSearchDialogShow()}
                        style={{ color: "#ff8800" }}
                        className="text-lg px-2 leading-none hover:text-[#fbba5e]"
                    >
                        <FontAwesomeIcon icon={faSearch} />
                    </button>
                </div>

                <button
                    hidden={isGuest(role)}
                    onClick={() => onUploadDialogShow()}
                    style={{ color: "#ff8800" }}
                    className="text-lg leading-none hover:text-[#fbba5e]"
                >
                    ＋
                </button>
            </div>
            <SidebarGroup className="py-0">
                <SidebarGroupContent className="relative">
                    <SidebarInput
                        value={filterText}
                        onChange={(e) => onSetFilterText(e.target.value)}
                        placeholder="Filter..." 
                        className="pl-8 border-[#444] w-full h-8 rounded bg-[#181818] border text-sm text-white"/>
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarHeader>
    );
}
