"use client";
import React from 'react';
import { Button } from '@/ui/button';
import { ButtonGroup } from '@/ui/button-group';
import { DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import { toDateRange, isToday, isRecent } from '@/lib/utils/date-helper';
import CalendarPopover from '@/ui/calendar-popover';
import { X } from 'lucide-react';

interface CalendarDateRadioProps extends React.ComponentProps<"div"> {
    value: DateRange | undefined;
    onSetValue: (x: DateRange | undefined) => void;
    collapseCalendarBtn?: boolean;
}

export default function CalendarDateRadio({
    value,
    onSetValue,
    collapseCalendarBtn = false,
    className,
    ...props
}: CalendarDateRadioProps) {
    const t = useTranslations("calendar-date-radio");
    const recentDay: number = 3;

    return (
        <div className={`${className}`}>
            <ButtonGroup>
                <Button
                    className={`text-white bg-[#333] hover:bg-[#fff] ${isToday(value) ? "bg-[#32cd32]" : ""}`}
                    variant="outline" size="sm"
                    onClick={() => {
                        const today = new Date();
                        onSetValue(toDateRange(today, today));
                    }
                    }>
                    {t("today")}
                </Button>
                <Button
                    className={`text-white bg-[#333] hover:bg-[#fff] ${isRecent(value, recentDay) ? "bg-[#32cd32]" : ""}`}
                    variant="outline" size="sm"
                    onClick={() => {
                        const today = new Date();
                        const lastDay = new Date();
                        lastDay.setDate(today.getDate() - recentDay);
                        onSetValue(toDateRange(lastDay, today));
                    }
                    }>
                    {t("recent", { days: recentDay })}
                </Button>
                {!collapseCalendarBtn && <>
                    <CalendarPopover
                        className="border-[#ccc] bg-[#181818] border h-8.2 mx-2"
                        value={value}
                        onSetValue={onSetValue} />
                </>}
                <Button
                    className={`text-white bg-[#333] hover:bg-[#fff]`}
                    variant="outline" size="sm" onClick={() => { onSetValue(undefined) }}>
                    <X />
                </Button>
            </ButtonGroup>
        </div>
    );
}
