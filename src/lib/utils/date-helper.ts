import { DateRange } from "react-day-picker";

export const isInvalidDate = (date: Date | undefined) => date === undefined || Number.isNaN(date.getTime());

export const toDateOnly = (d:Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const toDateRange = (from: Date | undefined, to: Date | undefined) => {
    if(isInvalidDate(from) || isInvalidDate(to)) return { from: undefined, to: undefined}

    const start = toDateOnly(from!);
    start.setHours(0, 0, 0, 0);
    const end = toDateOnly(to!);
    end.setHours(23, 59, 59, 999);

    return {from: start, to: end}
}

export const isSameDate = (l: Date, r: Date) => {
    return l.getFullYear() === r.getFullYear()
        && l.getMonth() === r.getMonth()
        && l.getDate() === r.getDate();
};

export const isToday = (range?: DateRange) => {
    if (!range?.from || !range.to) return false;

    const from = toDateOnly(range.from);
    const to = toDateOnly(range.to);
    const today = toDateOnly(new Date());

    return isSameDate(from, to) && isSameDate(from, today);
};

export const isRecent = (range?: DateRange, days = 3) => {
    if (!range?.from || !range.to) return false;

    const from = toDateOnly(range.from);
    const to = toDateOnly(range.to);
    const today = toDateOnly(new Date());

    const expectedFrom = new Date(today);
    expectedFrom.setDate(today.getDate() - days);

    return isSameDate(to, today)
        && isSameDate(from, expectedFrom);
};

/**
 * Revives DateRange restored from zustand persist.
 *
 * zustand persist serializes Date objects into strings via JSON,
 * so we need to convert them back to Date before using date APIs.
 */
export const normalizePersistedDateRange = (
    range?: DateRange,
): DateRange | undefined => {
    if (!range) return range;

    return {
        from: range.from ? new Date(range.from) : undefined,
        to: range.to ? new Date(range.to) : undefined,
    };
};