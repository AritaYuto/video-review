"use client";

import React, {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Tree, TreeApi } from "react-arborist";
import { useRouter } from "next/navigation";
import { useSize } from "@radix-ui/react-use-size";
import { Sidebar, SidebarContent, SidebarFooter } from "@/ui/sidebar"
import { SettingPopover } from "@/components/setting";
import { VideoNode } from "@/components/video-list-panel/tree/types";
import { NodeRenderer } from "@/components/video-list-panel/node-renderer";
import { buildTree, findPath } from "@/components/video-list-panel/tree/utils";
import VideoUploadDialog from "@/components/video-upload";
import VideoListPanelHeader from "@/components/video-list-panel/header";
import { VideoFilterParam, VideoSearchDialog } from "@/components/video-search";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { hasUnreadVideoComment } from "@/lib/fetch-wrapper";

export default function VideoListPanel() {
    const headerRef = useRef<HTMLDivElement>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const size = useSize(elementRef.current);
    const router = useRouter();
    const { userId } = useAuthStore();
    const { videos, fetchVideos, selectedVideo } = useVideoStore();
    const [videoFilterParam, setVideoFilterParam] = useState<VideoFilterParam>({
        searchMode: "dateFilterOff",
        dateRange: undefined,
        filterText: "",
    });
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [unReadVideoIds, setUnReadVideoIds] = useState<string[]>([]);
    const [bounds, setBounds] = useState({ width: 0, height: 0 });
    const [openNodes, setOpenNodes] = useState<Record<string, boolean>>(() => {
        try {
            const raw = localStorage.getItem("videoTreeOpenNodes");
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });
    const treeRef = useRef<TreeApi<VideoNode>>(null);

    const filteredVideos = useMemo(() => {
        if (!videoFilterParam || !videoFilterParam.filterText) return videos;

        const lower = videoFilterParam.filterText.toLowerCase();

        return videos.filter((v) => {
            return (
                v.title?.toLowerCase().includes(lower) ||
                v.folderKey?.toLowerCase().includes(lower) ||
                v.scenePath?.toLowerCase().includes(lower)
            );
        });
    }, [videos, videoFilterParam?.filterText]);

    const headerHeight = useMemo(() => {
        return headerRef.current ? headerRef.current.getBoundingClientRect().height : 0;
    }, [headerRef.current]);

    const treeHeight = useMemo(() => {
        return Math.max(0, bounds.height - headerHeight);
    }, [bounds.height, headerHeight]);

    useEffect(() => {
        if (!userId) {
            setUnReadVideoIds([]);
            return;
        }

        let cancelled = false;

        hasUnreadVideoComment(userId).then((ids) => {
            if (!cancelled) setUnReadVideoIds(ids);
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    const data = useMemo(
        () =>
            buildTree(
                filteredVideos,
                videoFilterParam.searchMode,
                unReadVideoIds,
            ),
        [filteredVideos],
    );

    const handleFetch = () => {
        if (!videoFilterParam) return;
        if (videoFilterParam.searchMode === undefined) return;

        const mode = videoFilterParam.searchMode;
        const dateRange = videoFilterParam.dateRange;

        switch (mode) {
            case "dateFilterOff":
                fetchVideos(undefined, undefined);
                break;
            case "dateRange":
                fetchVideos(dateRange?.from, dateRange?.to);
                break;
        }
    };

    const handleUploadDialogClose = () => {
        handleFetch();
        setUploadDialogOpen(false);
    };

    const handleSearchDialogClose = () => {
        setSearchDialogOpen(false);
    }

    useLayoutEffect(() => {
        // react-arborist requires explicit width/height, so we measure the panel manually
        // and subtract the header area to determine the available tree space.
        if (!elementRef.current || !headerRef.current) return;

        const rect = elementRef.current.getBoundingClientRect();

        if (!size?.width || !size?.height) {
            setBounds({
                width: rect.width,
                height: rect.height - headerHeight,
            });
        } else {
            setBounds({
                width: size.width,
                height: size.height - headerHeight,
            });
        }
    }, [size?.width, size?.height]);


    useEffect(() => {
        handleFetch();
    }, [videoFilterParam?.searchMode, videoFilterParam?.dateRange]);

    useEffect(() => {
        localStorage.setItem("videoTreeOpenNodes", JSON.stringify(openNodes));
    }, [openNodes]);

    useEffect(() => {
        const api = treeRef.current;
        if (!api) return;

        for (const [id, isOpen] of Object.entries(openNodes)) {
            if (isOpen) {
                api.open(id);
            } else {
                api.close(id);
            }
        }

        if (!selectedVideo) return;

        const node = api.get(selectedVideo.id);

        if (node) {
            // The target node is already mounted in the tree.
            // We can safely scroll to it without changing the open state.
            api.scrollTo(selectedVideo.id);
        } else {
            // The target node is not yet available.
            // This usually means one or more parent folders are still closed.
            const path = findPath(api.root, selectedVideo.id);

            if (path) {
                // Open all parent nodes so that the target node becomes visible.
                // The last node in the path is the target itself, so it is excluded.
                for (const node of path.slice(0, -1)) {
                    api.open(node.id);
                }

                // Scrolling must be deferred until after the tree re-renders
                // with the newly opened nodes.
                requestAnimationFrame(() => {
                    api.scrollTo(selectedVideo.id);
                });
            }
        }
    }, [data, selectedVideo?.id]);

    return (
        <Sidebar
            ref={elementRef}
            style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
            className="bg-[#181818] border-[#333]"
        >
            <VideoListPanelHeader
                ref={headerRef}
                onSearchDialogShow={() => setSearchDialogOpen(true)}
                onUploadDialogShow={() => setUploadDialogOpen(true)}
                filterText={videoFilterParam.filterText}
                onSetFilterText={(text) => setVideoFilterParam({ ...videoFilterParam, filterText: text })}
            />

            <SidebarContent className="font-sans text-white bg-[#181818] border-[#333]">
                <Tree
                    ref={treeRef}
                    data={data}
                    openByDefault
                    rowHeight={28}
                    width={bounds.width - 1}
                    height={treeHeight}
                    paddingBottom={50}
                    onToggle={(id) => {
                        const api = treeRef.current;
                        if (!api) return;

                        const node = api.get(id);
                        if (!node) return;

                        setOpenNodes((prev) => ({
                            ...prev,
                            [id]: node.isOpen,
                        }));
                    }}
                    onSelect={(nodes) => {
                        const node = nodes[0];
                        if (node?.data.type === "video" && node.data.video) {
                            router.replace(
                                `/video-review/review/${node.data.video.id}`,
                            );
                        }
                    }}
                >
                    {(props) => (
                        <NodeRenderer
                            {...props}
                            selectedId={selectedVideo?.id ?? ""}
                        />
                    )}
                </Tree>
            </SidebarContent>
            <SidebarFooter className="bg-[#181818] border-[#333]">
                <SettingPopover />
            </SidebarFooter>

            <VideoSearchDialog
                open={searchDialogOpen} onClose={() => handleSearchDialogClose()}
                videoFilterParam={videoFilterParam}
                updateVideoFilter={setVideoFilterParam} />
            <VideoUploadDialog open={uploadDialogOpen} onClose={() => handleUploadDialogClose()} />
        </Sidebar>
    );
}
