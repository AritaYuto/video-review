import { create } from "zustand";
import { DateRange } from "react-day-picker";

interface VideoSearchState {
    dateRange: DateRange | undefined;
    hasComment: boolean;
    hasDrawing: boolean;
    hasIssue: boolean;
    filterIssue: string;
    user: string | undefined;
    filterTree: string;

    setHasComment: (x: boolean) => void;
    setHasDrawing: (x: boolean) => void;
    setHasIssue: (x: boolean) => void;
    setFilterIssue: (x: string) => void;
    setCommentUser: (x: string | undefined) => void;
    setDateRange: (x: DateRange | undefined) => void;
    setFilterTree: (x: string) => void;
    clear: () => void;
}

export const useVideoSearchStore = create<VideoSearchState>((set) => ({
    dateRange: undefined,
    hasComment: false,
    hasDrawing: false,
    hasIssue: false,
    filterIssue: "",
    user: "",
    filterTree: "",

    setHasComment: (x: boolean) => set({ hasComment: x }),
    setHasDrawing: (x: boolean) => set({ hasDrawing: x }),
    setHasIssue: (x: boolean) => set({ hasIssue: x }),
    setFilterIssue: (x: string) => set({ filterIssue: x }),
    setCommentUser: (x: string | undefined) => set({ user: x }),
    setDateRange: (x: DateRange | undefined) => set({ dateRange: x }),
    setFilterTree: (x: string) => set({ filterTree: x }),
    clear: () => set({ 
        dateRange: undefined, 
        hasDrawing: false, 
        hasIssue: false, 
        filterIssue: "", 
        user: "", 
        filterTree: "" 
    })
}));
