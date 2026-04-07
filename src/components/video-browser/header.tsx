"use client";

import React, { useEffect } from "react";
import { X, Plus, Search, LayoutGrid, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";
import { isGuest } from "@/lib/role";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInput,
    useSidebar,
} from "@/ui/sidebar"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { useVideoDateFilterStore } from "@/stores/date-filter-store";
import { useVideoStore } from "@/stores/video-store";
import CalendarDateRadio from "@/ui/calendar-date-radio";
import { Separator } from "../ui/separator";
import { useLLMStatusStore } from "@/stores/llm-status-store";
import { useChatSearchStore } from "@/stores/chat-search-store";
import { ChatSearchPanel } from "@/components/chat-search";

export default function VideoListPanelHeader(
{ onSearchDialogShow, onUploadDialogShow, onThumbnailsToggle, thumbnailsOpen }: {
    onSearchDialogShow: () => void;
    onUploadDialogShow: () => void;
    onThumbnailsToggle: () => void;
    thumbnailsOpen: boolean;
}) {
    const t = useTranslations("video-list-panel");
    const { isMobile } = useSidebar();
    const { role } = useAuthStore();
    const { fetchVideos } = useVideoStore();
    const { filterTree, setFilterTree, isFiltering, clear } = useVideoSearchStore();
    const videoDate = useVideoDateFilterStore();
    const { available, checked, check } = useLLMStatusStore();
    const { open: openChat } = useChatSearchStore();

    // Refetch when the tree text or the date filter changes.
    useEffect(() => {
        fetchVideos();
    }, [filterTree, videoDate.mode, videoDate.from, videoDate.to, videoDate.days]);

    // The date filter now lives in its own store, so fold it into the indicator.
    const filtering = isFiltering() || videoDate.mode !== "none";

    useEffect(() => {
        if (!checked) check();
    }, []);

    const handleClear = () => {
        clear();
        videoDate.clear();
        fetchVideos();
    }

    return (
        <SidebarHeader
            style={{ color: "#ff8800" }}
            className="border-b p-3 font-semibold text-sm bg-[#181818] border-[#333]"
        >
            <div className="flex justify-between">
                <div>
                    <span>{t("title")}</span>
                    <button
                        onClick={() => onSearchDialogShow()}
                        className={`
                            inline-flex items-center justify-center
                            text-lg px-1 leading-none hover:text-[#ff5500]
                            ${filtering ? "text-[#15fa34ff]" : ""}
                        `}
                    >
                        <FontAwesomeIcon icon={faSearch} />
                    </button>
                    {filtering
                        ? (
                            <>
                                <button
                                    onClick={() => handleClear()}
                                    className="inline-flex items-center justify-center hover:text-[#ff5500]"
                                >
                                    <X className="size-5" />
                                </button>
                            </>
                        )
                        : (<></>)
                    }
                    <button
                        onClick={() => openChat()}
                        disabled={!available}
                        title={available ? undefined : "LLM is not configured"}
                        className={`
                            inline-flex items-center justify-center px-1 leading-none transition-colors
                            ${available ? "hover:text-[#ff5500]" : "opacity-30 cursor-not-allowed"}
                        `}
                    >
                        <MessageSquare className="size-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        data-slot="thumbnails-toggle"
                        // The panel does not render under the mobile sidebar sheet.
                        hidden={isMobile}
                        onClick={() => onThumbnailsToggle()}
                        title={t("thumbnails")}
                        className={`
                            inline-flex items-center justify-center
                            leading-none hover:text-[#ff5500]
                            ${thumbnailsOpen ? "text-[#15fa34ff]" : ""}
                        `}
                    >
                        <LayoutGrid className="size-5" />
                    </button>

                    <button
                        hidden={isGuest(role)}
                        onClick={() => onUploadDialogShow()}
                        className="text-lg leading-none hover:text-[#fbba5e]"
                    >
                        <Plus />
                    </button>
                </div>
            </div>
            <Separator className="bg-[#333]" />

            <ChatSearchPanel />

            <SidebarGroup className="py-0">
                <CalendarDateRadio
                    mode={videoDate.mode}
                    range={videoDate.mode === "range" && videoDate.from && videoDate.to
                        ? { from: new Date(videoDate.from), to: new Date(videoDate.to) }
                        : undefined}
                    onToday={videoDate.setToday}
                    onRecent={videoDate.setRecent}
                    onSetRange={videoDate.setRange}
                    onClear={videoDate.clear}
                    className="size-10" />

                <SidebarGroupContent className="relative mt-1">
                    <SidebarInput
                        value={filterTree}
                        onChange={(e) => setFilterTree(e.target.value)}
                        placeholder="Filter video..."
                        className="pl-8 border-[#fff] w-full h-8 rounded bg-[#181818] border text-sm text-white" />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarHeader>
    );
}
