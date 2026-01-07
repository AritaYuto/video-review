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
import { CommentFilterParam, CommentSearchPopover } from "@/components/dialog/comment-search";
import { readVideoComment } from "@/lib/fetch-wrapper";
import { useTranslations } from "next-intl";
import { slackToast } from "@/components/slack";
import CommentCard from "@/components/video-comment-panel/comment-card";

export default function VideoCommentPanel() {
    const t = useTranslations("video-comment-panel");
    const headerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const { displayName, email, userId } = useAuthStore();

    const {
        revisions,
        selectedVideo,
        selectedRevision,
    } = useVideoStore();

    const {
        editingComment,
        setEditing,
        setEditDrawingPath,
        setEditComment,
        setEditIssueId,
        editSave,
    } = useCommentEditStore();

    const revisionNums = useMemo<number[]>(() => {
        return revisions.map(v => v.revision).sort((a, b) => a - b);
    }, [revisions]);

    const { canvasSave } = useDrawingStore();

    const { setDisplayComments, comments, addComment } = useCommentStore();

    const { videoRefElement, currentTime } = useVideoReviewStore();

    const [commentFilterParam, setCommentFilterParam] = useState<CommentFilterParam>();

    const filteredComments = useMemo<VideoComment[]>(() => {
        const f = commentFilterParam;

        if (f === undefined || f.fetchMode === "fetchAll") {
            return comments;
        }

        const filteredComments: VideoComment[] = []
        for (const comment of comments) {
            const revisionContains = f.revRange.revFrom <= comment.videoRevNum && comment.videoRevNum <= f.revRange.revTo;

            if (!revisionContains) {
                continue;
            }

            const matchFiltered = comment.comment.includes(f.filterText) || comment.userName.includes(f.filterText);
            if (!matchFiltered) {
                continue;
            }
            filteredComments.push(comment);
        }

        return filteredComments;
    }, [comments, commentFilterParam]);

    useEffect(() => {
        if(!userId || !selectedVideo) return;
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

        const headerHeight = headerRef.current.getBoundingClientRect().height;
        const el = commentCardRefs.current[target.id];

        if (!el || !containerRef.current) return;

        // スクロール
        containerRef.current.scrollTo({
            top: el.offsetTop - headerHeight,
            behavior: "smooth",
        });
    }, [currentTime, filteredComments]);

    useEffect(() => {
        if (!revisionNums || revisionNums.length === 0) return;

        const lastIndex = revisionNums.length - 1;
        const revTo = revisionNums[lastIndex];

        const fromIndex = Math.max(0, lastIndex - 3);
        const revFrom = revisionNums[fromIndex];

        setCommentFilterParam({
            fetchMode: "fetchRange",
            filterText: "",
            revRange: { revFrom: revFrom, revTo: revTo }
        });
    }, [revisionNums]);

    useEffect(() => {
        setDisplayComments(filteredComments);
    }, [filteredComments]);

    return (
        <div className="vr-panel vr-scrollbar">
            <div ref={headerRef} className="vr-header">
                <div>
                    <span className="px-2">{t("title")}</span>
                    <CommentSearchPopover
                        revisions={revisionNums}
                        commentFilterParam={commentFilterParam}
                        updateCommentFilter={setCommentFilterParam}
                    />
                </div>
            </div>
            
            <CommentCard comments={filteredComments} containerRef={containerRef} commentCardRef={commentCardRefs} />

            <Separator className="bg-[#333]" />

            <CommentConfirmed
                confirmedLabel={editingComment ? "commentUpdate"  : "commentAdd"}
                comment={editingComment ? editingComment.comment : ""}
                issueId={editingComment ? editingComment.issueId ?? null : null}
                onCancel={() => setEditing(null)}
                onConfirmed={async (comment, issueId) => await handleCommentConfirmed(comment, issueId)}
            />
        </div>
    );
}