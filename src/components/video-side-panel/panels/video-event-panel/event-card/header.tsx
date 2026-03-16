"use client";

import { CardHeader } from "@/ui/card";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { VideoEventWithKind } from "@/lib/fetch-wrapper/events";

export default function EventCardHeader(props: { event: VideoEventWithKind }) {
    return (
        <CardHeader className="flex flex-row items-center justify-between px-3 pb-1">
            <div className="flex flex-col leading-none gap-1">
                <span className="text-sm font-medium">{props.event.kind.label}</span>
                <span className="text-xs text-[#888]">
                    {formatDate(props.event.createdAt)}
                </span>
            </div>
            <Badge className="bg-[#2f2f2f] text-[#ddd] border border-[#444]">
                #{props.event.seq}
            </Badge>
        </CardHeader>
    );
}
