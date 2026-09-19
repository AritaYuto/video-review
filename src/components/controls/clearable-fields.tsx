"use client";
import { X } from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import ComboBox from "@/components/controls/combo-box";

// A text filter with a button that resets it (or whatever `onClear` decides to reset).
export function ClearableTextField({ value, onChange, onClear, placeholder }: {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    placeholder?: string;
}) {
    return (
        <div className="flex gap-2">
            <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8" />
            <Button variant="outline" size="icon-sm" onClick={onClear}><X /></Button>
        </div>
    );
}

export function ClearableComboBox<T>({ options, value, setValue, onClear, placeholder }: {
    options: { value: T; label: string }[];
    value: T | undefined;
    setValue: (value: T) => void;
    onClear: () => void;
    placeholder?: string;
}) {
    return (
        <div className="flex gap-2">
            <ComboBox options={options} value={value} setValue={setValue} placeholder={placeholder} />
            <Button variant="outline" size="icon-sm" onClick={onClear}><X /></Button>
        </div>
    );
}
