import { VideoNode } from "@/components/video-browser/tree/types";
import { Folder, Film } from "lucide-react";
import { NewBadge } from "@/components/video-browser/new-badge";


interface Props {
    name: string;
    type: VideoNode["type"];
    unread: boolean;
    selected: boolean;
    style: React.CSSProperties;
    onClick: () => void;
}

export function TreeNodeRow({
    name,
    type,
    unread,
    selected,
    style,
    onClick,
}: Props) {
    const isFolder = type === "folder";

    return (
        <div
            style={style}
            onClick={onClick}
            className={[
                "flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none truncate",
                selected
                    ? "bg-sidebar-accent border-l-2 border-primary"
                    : "hover:bg-accent",
            ].join(" ")}
        >
            <div className="relative">
                {isFolder ? (
                    <Folder size={14} className="text-primary" />
                ) : (
                    <Film size={14} className="text-primary" />
                )}

                {unread && <NewBadge className="absolute -top-1 -left-1" />}
            </div>

            <span className="flex items-center gap-1">{name}</span>
        </div>
    );
}
