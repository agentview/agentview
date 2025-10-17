import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { cn } from "~/lib/utils"
import { Button } from "../ui/button"
import { Pill } from "../Pill"
import type { ControlComponentProps } from "~/types"

function Select({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
    return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
    return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
    return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger asChild {...props}>
            <Button variant="ghost" size="sm" className={cn(className)}>
                {children}
            </Button>
        </SelectPrimitive.Trigger>
    )
}

function SelectContent({
    className,
    children,
    position = "popper",
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                data-slot="select-content"
                className={cn(
                    "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
                    position === "popper" &&
                    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                    className
                )}
                position={position}
                {...props}
            >
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                    className={cn(
                        "p-1",
                        position === "popper" &&
                        "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
                    )}
                >
                    {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    )
}

function SelectLabel({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
    return (
        <SelectPrimitive.Label
            data-slot="select-label"
            className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
            {...props}
        />
    )
}

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(
                "focus:bg-accent hover:bg-accent cursor-pointer outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 py-1 px-1",
                className
            )}
            {...props}
        >
            <div className="flex items-center w-full">
                <Pill size="xs" className="flex-1">
                    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
                </Pill>
                <span className="ml-2 flex size-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                        <CheckIcon className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                </span>
            </div>
        </SelectPrimitive.Item>
    )
}

function SelectSeparator({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            data-slot="select-separator"
            className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
            {...props}
        />
    )
}

function SelectScrollUpButton({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
    return (
        <SelectPrimitive.ScrollUpButton
            data-slot="select-scroll-up-button"
            className={cn(
                "flex cursor-default items-center justify-center py-1",
                className
            )}
            {...props}
        >
            <ChevronUpIcon className="size-4" />
        </SelectPrimitive.ScrollUpButton>
    )
}

function SelectScrollDownButton({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
    return (
        <SelectPrimitive.ScrollDownButton
            data-slot="select-scroll-down-button"
            className={cn(
                "flex cursor-default items-center justify-center py-1",
                className
            )}
            {...props}
        >
            <ChevronDownIcon className="size-4" />
        </SelectPrimitive.ScrollDownButton>
    )
}

export type PillSelectOption<T extends string | number | boolean> = {
    value: T;
    icon?: React.ReactNode;
    label?: string;
}

export const PillSelect = (props: ControlComponentProps<string> & { options: PillSelectOption<string>[], placeholder?: string }) => {
    const { value, onChange, options, placeholder = "Select an option..." } = props;

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <Select value={value ?? ""} onValueChange={(newValue) => {
            onChange(newValue === "" ? null : newValue);
        }}>
            <SelectPrimitive.Trigger asChild>
                <Button variant="ghost" size="sm" className="justify-start px-1.5">
                    {selectedOption ? (
                        <Pill>
                            {selectedOption.icon}
                            {selectedOption.label ?? selectedOption.value}
                        </Pill>
                    ) : (
                        <span className="text-muted-foreground text-sm">{placeholder}</span>
                    )}
                </Button>
            </SelectPrimitive.Trigger>

            <SelectContent>
                {options.map((option) => (
                    <SelectPrimitive.Item
                        data-slot="select-item"
                        className={"focus:bg-accent hover:bg-accent cursor-pointer outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 py-1 px-1 rounded-md flex w-full"}
                        value={option.value}
                    >
                        {/* <div className="flex w-full"> */}
                            <Pill>
                                {option.icon}
                                <SelectPrimitive.ItemText>{option.label} gówno</SelectPrimitive.ItemText>
                            </Pill>
                            {/* <span className="ml-2 flex size-3.5 items-center justify-center">
                                <SelectPrimitive.ItemIndicator>
                                    <CheckIcon className="size-4" />
                                </SelectPrimitive.ItemIndicator>
                            </span> */}
                        {/* </div> */}
                    </SelectPrimitive.Item>

                    // <SelectItem key={option.value} value={option.value}>
                    //     {option.icon && <span className="mr-1.5">{option.icon}</span>}
                    //     {option.label ?? option.value}
                    // </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
}
