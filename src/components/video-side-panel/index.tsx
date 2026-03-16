"use client";

import { useEffect, useRef, useState } from "react";
import VideoCommentPanel from "@/components/video-side-panel/panels/video-comment-panel";
import VideoEventPanel from "@/components/video-side-panel/panels/video-event-panel";
import { CommentSearchDialog } from "@/components/dialog/comment-search";
import { VideoEventSearchDialog } from "@/components/dialog/video-event-search";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { X, Search } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput } from "@/ui/sidebar";
import CalendarDateRadio from "@/ui/calendar-date-radio";
import { Separator } from "@/ui/separator";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useVideoEventSearchStore } from "@/stores/video-event-search-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import { useVideoEventStore } from "@/stores/video-event-store";

export default function VideoSidePanel() {
    const tComment = useTranslations("video-comment-panel");
    const tEvent = useTranslations("video-event-panel");
    const [tab, setTab] = useState("comments");
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const topAreaRef = useRef<HTMLDivElement>(null);
    const { selectedRevision } = useVideoStore();
    const { fetchComments } = useCommentStore();
    const { fetchEvents } = useVideoEventStore();
    const commentSearch = useCommentSearchStore();
    const eventSearch = useVideoEventSearchStore();

    const isCommentTab = tab === "comments";
    const filterText = isCommentTab ? commentSearch.filterText : eventSearch.filterText;
    const setFilterText = isCommentTab ? commentSearch.setFilterText : eventSearch.setFilterText;
    const isFiltering = isCommentTab ? commentSearch.isFiltering : eventSearch.isFiltering;

    useEffect(() => {
        setSearchDialogOpen(false);
    }, [tab]);

    const handleClear = () => {
        if (isCommentTab) {
            commentSearch.clear();
            if (selectedRevision) {
                fetchComments(selectedRevision);
            }
            return;
        }

        eventSearch.clear();
        if (selectedRevision) {
            fetchEvents(selectedRevision);
        }
    }

    return (
        <Tabs value={tab} onValueChange={setTab} className="h-full gap-0">
            <div ref={topAreaRef}>
                <SidebarHeader
                    style={{ color: "#ff8800" }}
                    className="border-b p-3 font-semibold text-sm bg-[#181818] border-[#333]"
                >
                    <div className="flex justify-between">
                        <TabsList className="bg-[#222] border border-[#333] h-8">
                            <TabsTrigger value="comments" className="data-[state=active]:bg-[#3a2b00] data-[state=active]:text-[#ff8800] text-white">
                                {tComment("title")}
                            </TabsTrigger>
                            <TabsTrigger value="events" className="data-[state=active]:bg-[#3a2b00] data-[state=active]:text-[#ff8800] text-white">
                                {tEvent("tab")}
                            </TabsTrigger>
                        </TabsList>

                        <div>
                            <button
                                onClick={() => { setSearchDialogOpen(true) }}
                                className={`
                                    inline-flex items-center justify-center
                                    text-lg px-1 leading-none hover:text-[#ff5500]
                                    ${isFiltering() ? "text-[#15fa34ff]" : ""}
                                `}
                            >
                                <FontAwesomeIcon icon={faSearch} />
                            </button>
                            {isFiltering()
                                ? (
                                    <button
                                        onClick={() => { handleClear() }}
                                        className="inline-flex items-center justify-center hover:text-[#ff5500]"
                                    >
                                        <X className="size-5" />
                                    </button>
                                )
                                : null}
                        </div>
                    </div>

                    <Separator className="bg-[#333]" />

                    <SidebarGroup className="py-0">
                        {isCommentTab
                            ? <CalendarDateRadio value={commentSearch.dateRange} onSetValue={commentSearch.setDateRange} className="size-10" />
                            : null}

                        <SidebarGroupContent className="relative mt-1">
                            <SidebarInput
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                placeholder={isCommentTab ? "Filter comment text..." : "Filter event text..."}
                                className="pl-8 border-[#fff] w-full h-8 rounded bg-[#181818] border text-sm text-white"
                            />
                            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarHeader>
            </div>
            <TabsContent value="comments" className="min-h-0 mt-0">
                <VideoCommentPanel topAreaRef={topAreaRef} />
            </TabsContent>
            <TabsContent value="events" className="min-h-0 mt-0">
                <VideoEventPanel topAreaRef={topAreaRef} />
            </TabsContent>

            <CommentSearchDialog open={searchDialogOpen && isCommentTab} onClose={() => { setSearchDialogOpen(false) }} />
            <VideoEventSearchDialog open={searchDialogOpen && !isCommentTab} onClose={() => { setSearchDialogOpen(false) }} />
        </Tabs>
    );
}
