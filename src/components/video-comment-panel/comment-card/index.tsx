"use client";

import { useVideoReviewStore } from "@/stores/video-review-store";
import { VideoComment } from "@/lib/db-types";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import React, { useEffect } from "react";
import { Card } from "@/ui/card";

import CommentCardHeader from "@/components/video-comment-panel/comment-card/header";
import CommentCardContent from "@/components/video-comment-panel/comment-card/content";
import CommentCardFooter from "@/components/video-comment-panel/comment-card/footer";

export default function CommentCard(props: {
    comments: VideoComment[],
    containerRef: React.RefObject<HTMLDivElement | null>,
    commentCardRef: React.RefObject<Record<string, HTMLDivElement | null>>,
}) {
    const { editingComment, setEditing } = useCommentEditStore();
    const { selectedComment, setSelectComment, activeComments, setTimelineTime } = useVideoReviewStore();

    const handleSelectComment = (comment: VideoComment) => {
        setTimelineTime(comment.time)
        setSelectComment(comment);
    }

    useEffect(() => {
        if (!selectedComment) return;
        if (editingComment && editingComment.id !== selectedComment.id) {
            setEditing(null);
        }
    }, [selectedComment]);

    return (
        <div ref={props.containerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {props.comments.map((comment, i) => {
                const isActive = activeComments.some(e => e.id === comment.id);
                const isSelected = selectedComment?.id === comment.id;
                return (
                    <Card
                        ref={el => {
                            props.commentCardRef.current[comment.id] = el;
                        }}
                        key={comment.id}
                        className={`bg-[#222] border border-[#333] text-white hover:bg-[#252525] transition cursor-pointer
                                ${isSelected ? "border-[#ff8800] bg-[#3a2b00]" : isActive ? "border-[#666]" : ""}`}
                        onClick={() => handleSelectComment(comment)}
                    >
                        <CommentCardHeader comment={comment} />
                        <CommentCardContent comment={comment} />
                        <CommentCardFooter comment={comment} />
                    </Card>
                );
            })}
        </div>
    );
}