import { create } from "zustand";
import { DateRange } from "react-day-picker";

interface CommentSearchState {
    dateRange: DateRange | undefined;
    hasDrawing: boolean;
    hasIssue: boolean;
    fetchAllComments: boolean;
    user: string | undefined;
    filterText: string;

    setDateRange: (x: DateRange | undefined) => void;
    setHasDrawing: (x: boolean) => void;
    setHasIssue: (x: boolean) => void;
    setFetchAllComments: (x: boolean) => void;
    setCommentUser: (x: string | undefined) => void;
    setFilterText: (x: string) => void;
    clear: () => void;
    isFiltering: () => boolean;
}

const InitCommentSearchState = {
    dateRange: undefined,
    hasDrawing: false,
    hasIssue: false,
    fetchAllComments: true,
    user: "",
    filterText: "",
};

export const useCommentSearchStore = create<CommentSearchState>((set, get) => ({
    ...InitCommentSearchState,

    setDateRange: (x: DateRange | undefined) => set({ dateRange: x }),
    setHasDrawing: (x: boolean) => set({ hasDrawing: x }),
    setHasIssue: (x: boolean) => set({ hasIssue: x }),
    setFetchAllComments: (x: boolean) => set({ fetchAllComments: x }),
    setCommentUser: (x: string | undefined) => set({ user: x }),
    setFilterText: (x: string) => set({ filterText: x }),
    clear: () => set(InitCommentSearchState),
    isFiltering: () => {
        const state = get();

        return Object.keys(InitCommentSearchState).some((key) => {
            return state[key as keyof typeof InitCommentSearchState]
                !== InitCommentSearchState[key as keyof typeof InitCommentSearchState];
        });
    }
}));
