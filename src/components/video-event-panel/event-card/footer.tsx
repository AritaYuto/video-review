"use client";

import { CardFooter } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { useTranslations } from "next-intl";
import { VideoEventWithKind } from "@/lib/fetch-wrapper/events";

export default function EventCardFooter(props: { event: VideoEventWithKind }) {
    const t = useTranslations("video-event-panel");

    return (
        <CardFooter className="flex justify-end px-2">
            <div className="flex gap-1">
                {props.event.link
                    ? (
                        <Badge className="bg-white hover:bg-[#333]">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(props.event.link ?? "", "_blank", "noreferrer");
                                }}
                                className="flex items-center gap-1 text-black hover:text-[#ff8800] transition"
                            >
                                <FontAwesomeIcon icon={faLink} />
                                <span className="text-xs">{t("openLink")}</span>
                            </button>
                        </Badge>
                    )
                    : null}
            </div>
        </CardFooter>
    );
}
