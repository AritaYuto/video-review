import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface MultiComboBoxProps {
    label?: string;
    options: string[];
    value: string[];
    setValue: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function MultiComboBox({
    label,
    options,
    value,
    setValue,
    placeholder = "Select...",
    disabled = false,
}: MultiComboBoxProps) {
    const toggleValue = (item: string) => {
        if (value.includes(item)) {
            setValue(value.filter((v) => v !== item));
        } else {
            setValue([...value, item]);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className="text-sm text-muted-foreground">
                    {label}
                </label>
            )}

            <Popover modal>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className="justify-between"
                    >
                        <div className="flex gap-1 flex-wrap">
                            {value.length === 0 && (
                                <span className="text-muted-foreground">
                                    {placeholder}
                                </span>
                            )}
                            {value.map((v) => (
                                <Badge key={v} variant="outline">
                                    {v}
                                </Badge>
                            ))}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-60">
                    <Command>
                        <CommandInput placeholder="Search..." />
                        <CommandList className="max-h-60 scrollbar-thin">
                            <CommandEmpty>No options found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option}
                                        onSelect={() => toggleValue(option)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value.includes(option)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {option}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
