"use client";

import { CardContent } from "@/ui/card";
import { formatTime } from "@/lib/utils";
import { VideoEventWithKind } from "@/lib/fetch-wrapper/events";

export default function EventCardContent(props: { event: VideoEventWithKind }) {
    return (
        <CardContent className="px-3">
            <div className="mb-2 flex gap-1 text-xs">
                <span className="border border-[#7f783d] text-[#eae60b] bg-[#7f783d] rounded px-1">
                    {formatTime(props.event.startMs / 1000)}
                </span>
                <span className="border border-[#555] text-[#ddd] bg-[#333] rounded px-1">
                    {formatTime(props.event.endMs / 1000)}
                </span>
            </div>
            <p className="text-sm text-[#ccc] whitespace-pre-line">
                {props.event.data}
            </p>
        </CardContent>
    );
}
