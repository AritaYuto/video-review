"use client";

import { VideoComment } from "@/lib/db-types";
import { CardContent } from "@/ui/card";

export default function CommentCardContent(props: { comment: VideoComment }) {
    return (
        <CardContent className="px-3">
            {(props.comment.issueId && process.env.NEXT_PUBLIC_JIRA_BASE_URL !== undefined) && (
                <a
                    className="text-[#4ea7ff] text-xs hover:underline"
                    href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL}/browse/${props.comment.issueId}`}
                    target="_blank"
                >
                    {props.comment.issueId}
                </a>
            )}

            <p className="text-sm text-[#ccc] whitespace-pre-line">{props.comment.comment}</p>
        </CardContent>
    );
}
