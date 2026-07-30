"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter } from "@/ui/sidebar"
import { SettingPopover } from "@/components/setting";
import VideoUploadDialog from "@/components/dialog/video-upload";
import VideoListPanelHeader from "@/components/video-browser/header";
import { VideoSearchDialog } from "@/components/dialog/video-search";
import VideoThumbnailsPanel from "@/components/video-browser/video-thumbnails-panel";
import VideoFoldersTree from "@/components/video-browser/video-folders-tree";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { hasUnreadVideoComment } from "@/lib/fetch-wrapper";

export default function VideoListPanel() {
    const router = useRouter();
    const { userId } = useAuthStore();
    const { videos, fetchVideos, selectedVideo, selectedRevision } = useVideoStore();
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
    const [unReadVideoIds, setUnReadVideoIds] = useState<string[]>([]);

    useEffect(() => {
        void (async () => {
            await fetchVideos();
        })();
    }, [])

    useEffect(() => {
        if (!userId) {
            setUnReadVideoIds([]);
            return;
        }

        let cancelled = false;

        hasUnreadVideoComment(userId).then((ids) => {
            if (!cancelled) setUnReadVideoIds(ids);
        }).catch((reason) => {
            cancelled = true;
            console.error(reason);
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return (
        <>
            <Sidebar
                style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
                className="bg-[#181818] border-[#333] "
            >
                <VideoListPanelHeader
                    onSearchDialogShow={() => setSearchDialogOpen(true)}
                    onUploadDialogShow={() => setUploadDialogOpen(true)}
                    onThumbnailsToggle={() => setThumbnailsOpen((open) => !open)}
                    thumbnailsOpen={thumbnailsOpen}
                />

                <SidebarContent className="font-sans text-white bg-[#181818] border-[#333]">
                    <VideoFoldersTree
                        videos={videos}
                        unReadVideoIds={unReadVideoIds}
                        selectedVideoId={selectedVideo?.id ?? null}
                        onSelectVideo={(id) => {
                            router.replace(`/video-review/review/${id}`);
                        }}
                    />
                </SidebarContent>

                <SidebarFooter className="bg-[#181818] border-[#333]">
                    <SettingPopover />
                </SidebarFooter>

                <VideoSearchDialog open={searchDialogOpen} onClose={() => setSearchDialogOpen(false)} />
                <VideoUploadDialog open={uploadDialogOpen} onClose={() => {
                    fetchVideos();
                    setUploadDialogOpen(false);
                }} />
            </Sidebar>

            <VideoThumbnailsPanel
                open={thumbnailsOpen}
                videos={videos}
                videoRevision={selectedRevision?.revision}
                selectedVideoId={selectedVideo?.id}
                onSelectVideo={(id) => {
                    router.replace(`/video-review/review/${id}`);
                }}
                onClose={() => setThumbnailsOpen(false)}
            />
        </>
    );
}
