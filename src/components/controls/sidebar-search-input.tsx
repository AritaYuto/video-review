"use client";
import { Search } from "lucide-react";
import { SidebarGroupContent, SidebarInput } from "@/ui/sidebar";

// A sidebar text filter with a search icon inside the field.
export function SidebarSearchInput({ value, onChange, placeholder }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <SidebarGroupContent className="relative mt-1">
            <SidebarInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
        </SidebarGroupContent>
    );
}
