"use client";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useMemo } from "react";
import { Slider } from "@/ui/slider";
import { cn } from "@/lib/utils";

export default function VideoTimelineBar() {
    const { displayComments } = useCommentStore();
    const {
        timelineTime,
        currentTime,
        duration,
        setCurrentTime,
        setTimelineTime,
    } = useVideoReviewStore();

    const commentTimeSet = useMemo(() => {
        const set = new Set<number>();
        for (const c of displayComments) {
            set.add(Number(c.time.toFixed(2)));
        }
        return set;
    }, [displayComments]);

    // Slider API expects an array even for a single thumb.
    const value = [timelineTime ?? currentTime];

    return (
        <div className="relative h-6 w-full cursor-pointer select-none">
            <Slider
                min={0}
                max={duration}
                step={0.01}
                value={value}
                onValueChange={(v) => {
                    setTimelineTime(v[0]);
                }}
                onValueCommit={(v) => {
                    setCurrentTime(v[0]);
                    setTimelineTime(null);
                }}
                className="w-full"
            />

            {/* Comment markers are quantized to 0.01s to avoid near-duplicate positions.
                Clicking a marker jumps playback to that timestamp.
                The active marker is highlighted when close to current playback time. */}
            {
                [...commentTimeSet.entries()].map(([t]) => (
                    <div
                        key={t}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(t);
                        }}
                        className={cn(
                            "absolute left-(--marker-left) -top-2.5 -translate-x-1/2 w-1.25 h-6.25 rounded-xs cursor-pointer",
                            Math.abs(currentTime - t) < 0.5 ? "bg-foreground" : "bg-primary",
                        )}
                        style={{ "--marker-left": `${(t / duration) * 100}%` } as React.CSSProperties}
                    />
                ))}
        </div>
    );
}
