"use client";
import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover } from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/command';
import { PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

interface ComboBoxProps extends React.ComponentProps<"div"> {
    options: { value: any, label: string }[];
    placeholder?: string;
    value: any | undefined;
    setValue: (value: any) => void;
}

export default function ComboBox({
    options,
    value,
    setValue,
    placeholder,
    className,
    ...props
}: ComboBoxProps) {
    const [open, setOpen] = React.useState(false);

    if (!options) return <> </>
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button className={`${className} bg-[#181818] text-[#ddd] `} variant="outline" role="combobox" aria-expanded={open} >
                    {value
                        ? options.find((option) => option.value === value)?.label
                        : placeholder ?? ""}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 ">
                <Command className={`bg-[#181818] text-[#999]`}>
                    <CommandInput placeholder={placeholder ?? ""}/>
                    <CommandList >
                        <CommandEmpty>Not found.</CommandEmpty>
                        <CommandGroup >
                            {options.map((option) => (
                                <CommandItem
                                    className={`text-[#fff] data-[selected=true]:bg-[#eee] data-[selected=true]:text-[#222]`}
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue === value ? "" : currentValue)
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
