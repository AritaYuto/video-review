"use client";

import { Separator } from "@/ui/separator";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { captureFrame } from "@/lib/utils";
import { useCommentStore } from "@/stores/comment-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { VideoComment } from "@/lib/db-types";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import CommentConfirmed from "@/components/video-comment-panel/comment-confirmed";
import { useDrawingStore } from "@/stores/drawing-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommentSearchDialog } from "@/components/dialog/comment-search";
import { readVideoComment } from "@/lib/fetch-wrapper";
import { useTranslations } from "next-intl";
import { slackToast } from "@/components/slack";
import CommentCard from "@/components/video-comment-panel/comment-card";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { X, Search } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarInput } from "@/ui/sidebar";
import CalendarDateRadio from "@/ui/calendar-date-radio";

export default function VideoCommentPanel() {
    const t = useTranslations("video-comment-panel");
    const headerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const { displayName, email, userId } = useAuthStore();
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { setDisplayComments, comments, addComment, fetchComments } = useCommentStore();
    const { dateRange, filterText, setDateRange, setFilterText, clear, isFiltering } = useCommentSearchStore();
    const { canvasSave } = useDrawingStore();
    const { videoRefElement, currentTime } = useVideoReviewStore();
    const {
        editingComment,
        setEditing,
        setEditDrawingPath,
        setEditComment,
        setEditIssueId,
        editSave,
    } = useCommentEditStore();

    const filteredComments = useMemo<VideoComment[]>(() => {

        const filteredComments: VideoComment[] = []
        for (const comment of comments) {

            filteredComments.push(comment);
        }

        return filteredComments;
    }, [comments]);

    useEffect(() => {
        if (!userId || !selectedVideo) return;
        readVideoComment(userId, selectedVideo.id);
    }, [comments]);

    const handleCommentConfirmed = async (comment: string, issueId: string | null) => {
        if (!editingComment) {
            if (selectedRevision) {
                const id = await addComment({
                    videoId: selectedRevision?.videoId,
                    videoRevNum: selectedRevision?.revision,
                    userName: displayName ?? "unknown",
                    comment: comment,
                    issueId: issueId,
                    time: currentTime,
                    userEmail: email ?? "",
                    thumbsUp: 0,
                })

                await handlePostCommentToSlack(id);
            }
        } else {
            const drawingPath = await canvasSave(editingComment.drawingPath ?? null);
            setEditDrawingPath(drawingPath);
            setEditComment(comment);
            setEditIssueId(issueId);
            editSave();
        }
    }

    const handlePostCommentToSlack = async (id: string) => {
        const screenshot = await captureFrame(videoRefElement);
        await slackToast(id, screenshot);
    }

    useEffect(() => {
        let target = filteredComments[0];
        if (target === undefined || !headerRef?.current) {
            return;
        }

        for (let i = 0; i < filteredComments.length; i++) {
            if (filteredComments[i].time <= currentTime) {
                target = filteredComments[i];
            }
            else break;
        }

        const headerHeight = headerRef.current.getBoundingClientRect().height + 5;
        const el = commentCardRefs.current[target.id];

        if (!el || !containerRef.current) return;

        // スクロール
        containerRef.current.scrollTo({
            top: el.offsetTop - headerHeight,
            behavior: "smooth",
        });
    }, [currentTime, filteredComments]);

    useEffect(() => {
        setDisplayComments(filteredComments);
    }, [filteredComments]);

    useEffect(() => {
        if (selectedRevision) {
            fetchComments(selectedRevision);
        }
    }, [dateRange, filterText]);

    const handleClear = () => {
        clear();
        if (selectedRevision) {
            fetchComments(selectedRevision);
        }
    }

    return (
        <div className="vr-panel vr-scrollbar">
            <div ref={headerRef} className="vr-header">
                <div>
                    <div className="h-6">
                        <span className="px-2">{t("title")}</span>
                        <button
                            onClick={() => setSearchDialogOpen(true)}
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
                    </div>
                    <Separator className="bg-[#333]" />
                    <div>
                        <SidebarGroup>
                            <CalendarDateRadio value={dateRange} onSetValue={setDateRange} className="size-10" />
                            <SidebarGroupContent className="relative mt-1">
                                <SidebarInput
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    placeholder="Filter video..."
                                    className="pl-8 border-[#fff] w-full h-8 rounded bg-[#181818] border text-sm text-white" />
                                <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </div>
                </div>
            </div>

            <Separator className="bg-[#333]" />

            <CommentCard comments={filteredComments} containerRef={containerRef} commentCardRef={commentCardRefs} />

            <Separator className="bg-[#333]" />
            <CommentConfirmed
                confirmedLabel={editingComment ? "commentUpdate" : "commentAdd"}
                comment={editingComment ? editingComment.comment : ""}
                issueId={editingComment ? editingComment.issueId ?? null : null}
                onCancel={() => setEditing(null)}
                onConfirmed={async (comment, issueId) => await handleCommentConfirmed(comment, issueId)}
            />
            <CommentSearchDialog open={searchDialogOpen} onClose={() => setSearchDialogOpen(false)} />
        </div>
    );
}