"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";
import { useCommentStore } from "@/stores/comment-store";
import { VideoComment } from "@/lib/db-types";
import { CardFooter } from "@/ui/card";

export default function CommentCardFooter(props: { comment: VideoComment }) {
    const {incrementThumbsUpCount } = useCommentStore();

    const handleLike = (id: string) => {
        incrementThumbsUpCount(id);
    }

    return (
        <CardFooter className="flex items-center justify-between px-3 py-0.5">
            {/* 👍 like button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleLike(props.comment.id);
                }}
                className="flex items-center gap-1 text-[#ccc] hover:text-[#ff8800] transition"
            >
                <FontAwesomeIcon icon={faThumbsUp} />
                <span className="text-xs">{props.comment.thumbsUp ?? 0}</span>
            </button>

            <span className="text-xs text-[#ccc]">
                {formatDate(props.comment.createdAt)} : Rev.{props.comment.videoRevNum}
            </span>
        </CardFooter>
    );
}

