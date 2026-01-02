import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/ui/calendar";
import { Switch } from "@/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";

export type EDateSearchMode = "dateFilterOff" | "dateRange";

export type VideoFilterParam = {
    searchMode: EDateSearchMode;
    dateRange: DateRange | undefined;
    filterText: string;
}

export function VideoSearchDialog({
    open, onClose,
    videoFilterParam,
    updateVideoFilter
}: {
    open: boolean; onClose: () => void,
    videoFilterParam: VideoFilterParam | undefined,
    updateVideoFilter: (param: VideoFilterParam) => void;
}) {
    const t = useTranslations("video-search");
    const inputRef = useRef<HTMLInputElement>(null);
    const [localParam, setLocalParam] = useState<VideoFilterParam | undefined>(videoFilterParam);

    useEffect(() => {
        if (open) {
            setLocalParam(videoFilterParam);
        }
    }, [open, videoFilterParam]);

    const setSearchMode = (x: EDateSearchMode) => {
        setLocalParam(p => p ? { ...p, searchMode: x } : p);
    };

    const setDateRange = (x: DateRange | undefined) => {
        setLocalParam(p => p ? { ...p, dateRange: x } : p);
    };

    const setFilterText = (x: string) => {
        setLocalParam(p => p ? { ...p, filterText: x } : p);
    };

    const apply = () => {
        if (!localParam) return;
        updateVideoFilter(localParam);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={x => apply()}>
            <DialogContent className="bg-[#202020]">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="flex items-center space-x-3 py-2">
                    <Switch
                        className="border-white"
                        checked={localParam?.searchMode === "dateRange"}
                        onCheckedChange={(x) =>
                            setSearchMode(x ? "dateRange" : "dateFilterOff")
                        }
                    />
                    <span className="text-sm text-gray-100">
                        {localParam?.searchMode ? t(localParam?.searchMode) : ""}
                    </span>
                </div>


                {localParam?.searchMode === "dateRange" ? (
                    <div className="flex items-center space-x-3">
                        <Calendar
                            mode="range"
                            defaultMonth={localParam?.dateRange?.to}
                            selected={localParam?.dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            className='rounded-md border bg-[#1f1f1f]'
                            classNames={{
                                range_start: 'bg-[#ff880055] dark:bg-[#ff880055] rounded-l-full',
                                range_end: 'bg-[#ff880055] dark:bg-[#ff880055] rounded-r-full',
                                day_button: [
                                    // 選択状態
                                    "data-[range-start=true]:rounded-full!",
                                    "data-[range-start=true]:bg-[#ff8800]!",
                                    "data-[range-start=true]:text-white!",

                                    "data-[range-end=true]:rounded-full!",
                                    "data-[range-end=true]:bg-[#ff8800]!",
                                    "data-[range-end=true]:text-white!",

                                    // 中間の範囲
                                    "data-[range-middle=true]:rounded-none",
                                    "data-[range-middle=true]:bg-[#ff880055]",
                                    "data-[range-middle=true]:text-white!",

                                    // hover 時（全体の丸み補正）
                                    "hover:rounded-full",
                                ].join(" "),
                                today:
                                    'data-[selected=true]:rounded-l-none! rounded-full bg-[#ee990077]!'
                            }}
                        />
                    </div>
                ) : <></>}

                <div className="flex flex-col mt-3">
                    <span className="text-xs text-gray-400 mb-0.5">{t("searchFilter")}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={localParam?.filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="border-[#ccc] w-full h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                        placeholder="Filter..."
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
