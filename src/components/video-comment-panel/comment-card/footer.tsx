"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp, faComment, faPalette } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";
import { useCommentStore } from "@/stores/comment-store";
import { VideoComment } from "@/lib/db-types";
import { CardFooter } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Palette } from "lucide-react";

export default function CommentCardFooter(props: { comment: VideoComment }) {
    const { incrementThumbsUpCount } = useCommentStore();

    const handleLike = (id: string) => {
        incrementThumbsUpCount(id);
    }

    const hasIssueId = props.comment.issueId && process.env.NEXT_PUBLIC_JIRA_BASE_URL !== undefined;
    const hasSlackMessage = props.comment.slackMessage;
    const hasDrawing = props.comment.drawingPath !== "" && props.comment.drawingPath !== null;

    return (
        <CardFooter className="flex justify-end px-2">
            <div>
                <div className="flex w-full gap-1">
                    {hasIssueId && (
                        <Badge className="bg-white" >
                            <a
                                className="text-[#4ea7ff] text-xs hover:underline"
                                href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL}/browse/${props.comment.issueId}`}
                                target="_blank">
                                {props.comment.issueId}
                            </a>
                        </Badge>
                    )}
                    {hasSlackMessage && (
                        <Badge className="bg-white">
                            <a
                                href={`https://${process.env.NEXT_PUBLIC_SLACK_TEAM}.slack.com/archives/${props.comment.slackMessage?.channelId}/p${props.comment.slackMessage?.ts}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-centertext-[#4A154B]hover:text-[#611f69]"
                                aria-label="Open in Slack">
                                <FontAwesomeIcon icon={faComment} className="flex items-center gap-1 text-black hover:text-[#ff8800] transition"/> 
                                <span className="text-black">Slack</span>
                            </a>
                        </Badge>
                    )}

                    {hasDrawing && (
                        <Badge className="bg-white">
                                <FontAwesomeIcon icon={faPalette} size="xl" className="text-black"/> 
                        </Badge>
                    )}

                    
                    <Badge className="bg-white">
                        {/* 👍 like button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike(props.comment.id);
                            }}
                            className="flex items-center gap-1 text-black hover:text-[#ff8800] transition"
                        >
                            <FontAwesomeIcon icon={faThumbsUp} />
                            <span className="text-xs">{props.comment.thumbsUp ?? 0}</span>
                        </button>
                    </Badge>
                </div>
            </div>
        </CardFooter>
    );
}

