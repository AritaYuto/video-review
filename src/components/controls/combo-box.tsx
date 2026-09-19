"use client";
import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover } from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/command';
import { PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

interface ComboBoxProps<T> extends React.ComponentProps<"div"> {
    options: { value: T, label: string }[];
    placeholder?: string;
    value: T | undefined;
    setValue: (value: T) => void;
}

export default function ComboBox<T>({
    options,
    value,
    setValue,
    placeholder,
    className,
    ...props
}: ComboBoxProps<T>) {
    const [open, setOpen] = React.useState(false);

    if (!options) return <> </>
    const currentItem = options.find((option) => option.value === value);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button className={className} variant="outline" role="combobox" aria-expanded={open}>
                    {currentItem ? currentItem.label : <span className="text-muted-foreground">{placeholder ?? ""}</span>}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 ">
                <Command>
                    <CommandInput placeholder={placeholder ?? ""}/>
                    <CommandList >
                        <CommandEmpty>Not found.</CommandEmpty>
                        <CommandGroup >
                            {options.map((option) => (
                                <CommandItem
                                    key={String(option.label)}
                                    value={String(option.value)}
                                    onSelect={() => {
                                        setValue(option.value);
                                        setOpen(false)
                                    }}
                                >
                                    {option.label}
                                    <Check
                                        className={cn("ml-auto", value === option.value ? "opacity-100" : "opacity-0")}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
