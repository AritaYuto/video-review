"use client";

import React from "react";
import { TimelineCard, type TimelineCardState } from "@/components/video-side-panel/timeline-card";

export default function TimelineCardList<T>(props: {
    items: T[];
    containerRef: React.RefObject<HTMLDivElement | null>;
    itemCardRef: React.RefObject<Record<string, HTMLDivElement | null>>;
    // The key must be stable because panel content uses refs for timeline sync scrolling.
    getKey: (item: T) => string;
    getCardState?: (item: T) => TimelineCardState;
    onClick?: (item: T) => void;
    renderHeader?: (item: T) => React.ReactNode;
    renderContent: (item: T) => React.ReactNode;
    renderFooter?: (item: T) => React.ReactNode;
}) {
    return (
        <div ref={props.containerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {props.items.map((item) => {
                const key = props.getKey(item);

                return (
                    <TimelineCard
                        ref={el => {
                            // Panels read back these refs to scroll the active/selected card into view.
                            props.itemCardRef.current[key] = el;
                        }}
                        key={key}
                        state={props.getCardState?.(item)}
                        onClick={() => { props.onClick?.(item) }}
                    >
                        {props.renderHeader?.(item)}
                        {props.renderContent(item)}
                        {props.renderFooter?.(item)}
                    </TimelineCard>
                );
            })}
        </div>
    );
}
