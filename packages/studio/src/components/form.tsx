import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ControlComponent, ControlComponentProps, FormComponentProps } from "~/types";
import { Input } from "./ui/input";
import {
    ToggleGroup,
    ToggleGroupItem,
} from "./ui/toggle-group"
import { Textarea } from "./ui/textarea";
import { FormDescription, FormItem, FormLabel, FormMessage, FormField, FormControl } from "./ui/form";
import React from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "./ui/form";
import { Alert } from "./ui/alert";
import { AlertCircleIcon, ArrowUpIcon, PauseIcon } from "lucide-react";
import { AlertDescription } from "./ui/alert";
import { z } from "zod";
import type { BaseError } from "~/lib/errors";
import { cn } from "~/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "./ui/input-group";
import { Badge } from "./ui/badge";
import { TagPill } from "./TagPill";


export type Option<T extends string | number | boolean> = {
    value: T;
    icon?: React.ReactNode;
    label?: string;
}

export const ToggleGroupControl = <T extends string | number | boolean = string>(props: ControlComponentProps<T> & { options: Option<T>[], collapseOnSelect?: boolean, showLabelOnlyOnSelect?: boolean }) => {
    const { value, onChange, options, collapseOnSelect, showLabelOnlyOnSelect } = props;

    const stringValue = value === null || value === undefined ? "" : String(value);
    const type = typeof options[0].value;

    return (
        <ToggleGroup type="single" variant="outline" size="xs" value={stringValue} onValueChange={(value) => {
            if (value === "") {
                onChange(null);
            } else {
                if (type === "string") {
                    onChange(value as T);
                } else if (type === "number") {
                    onChange(Number(value) as T);
                } else if (type === "boolean") {
                    onChange((value === "true" ? true : false) as T);
                } else {
                    throw new Error(`[ToggleGroupControl] Invalid type`);
                }
            }
        }}>
            {options.map((option) => {
                const icon = option.icon;
                let label = option.label;
                if (!icon && !label) {
                    label = String(option.value);
                }

                // if not selected
                if (collapseOnSelect && stringValue !== '' && stringValue !== String(option.value)) {
                    return null;
                }

                if (stringValue === '' && showLabelOnlyOnSelect) {
                    label = undefined;
                }

                return (
                    <ToggleGroupItem key={String(option.value)} value={String(option.value)} aria-label={`Toggle ${option.value}`}>
                        {icon}
                        {label}
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    )
}

export function OptionDisplay<T extends string | number | boolean = string>({ value, options }: { value: T, options: Option<T>[] }) {
    const option = options.find(opt => opt.value === value);

    if (!option) {
        return <div className="text-sm text-muted-foreground">Undefined</div>;
    }

    return (
        <TagPill>
            {option.icon}
            {option.label}
        </TagPill>
    );
}

// export type BooleanToggleGroupOptions = {
//     trueLabel?: string;
//     trueIcon?: React.ReactNode;
//     falseLabel?: string;
//     falseIcon?: React.ReactNode;
// }

// export type BooleanToggleGroupControlProps = ControlComponentProps<boolean> & BooleanToggleGroupOptions

// export const BooleanToggleGroupControl = ({ value, onChange, trueLabel, trueIcon, falseLabel, falseIcon }: BooleanToggleGroupControlProps) => {
//     const options: ToggleGroupControlOption[] = [
//         {
//             value: "true",
//             label: trueLabel,
//             icon: trueIcon
//         },
//         {
//             value: "false",
//             label: falseLabel,
//             icon: falseIcon
//         }
//     ];

//     const stringValue = value === true ? "true" : value === false ? "false" : null;

//     return (
//         <ToggleGroupControl
//             value={stringValue}
//             onChange={(newValue) => {
//                 // onChange(newValue === "true");
//                 if (newValue === null) {
//                     onChange(null);
//                 } else {
//                     onChange(newValue === "true");
//                 }
//             }}
//             options={options}
//         />
//     );
// }

// export function BooleanToggleGroupDisplay({ value, trueLabel, trueIcon, falseLabel, falseIcon }: { value: boolean } & BooleanToggleGroupOptions) {
//     const options: ToggleGroupControlOption[] = [
//         {
//             value: "true",
//             label: trueLabel,
//             icon: trueIcon
//         },
//         {
//             value: "false",
//             label: falseLabel,
//             icon: falseIcon
//         }
//     ];
//     return <ToogleGroupDisplay value={value ? "true" : "false"} options={options} />
// }

export type SelectControlOption = {
    value: string;
    label?: string;
    icon?: React.ReactNode;
}

export type SelectControlProps = ControlComponentProps<string | undefined> & {
    options: SelectControlOption[];
    placeholder?: string;
}

export const SelectControl = ({ value, onChange, options, placeholder = "Select an option..." }: SelectControlProps) => {
    return (
        <Select value={value ?? ""} onValueChange={(newValue) => {
            onChange(newValue === "" ? undefined : newValue);
        }}>
            <SelectTrigger size="sm">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.icon && <span className="mr-2">{option.icon}</span>}
                        {option.label ?? option.value}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function SelectDisplay({ value, options }: { value: string | undefined, options: SelectControlOption[] }) {
    const option = options.find(opt => opt.value === value);

    if (!option || value === undefined) {
        return <div className="text-sm text-muted-foreground">Not selected</div>;
    }

    return (
        <Badge variant="default" className="text-xs flex items-center gap-1">
            {option.icon}
            {option.label ?? option.value}
        </Badge>
    );
}


// export const SelectInput: React.ComponentType<FormInputProps<string | undefined>> = ({ value, onChange, name, id, options }) => {
//     return <Select onValueChange={(value) => onChange(value === "" ? undefined : value)} defaultValue={value}>
//         <SelectTrigger>
//             <SelectValue placeholder="Pick option" />
//         </SelectTrigger>
//         <SelectContent>
//             {options.items.map((item: any) => {
//                 const value = typeof item === 'string' ? item : item.value;
//                 const label = typeof item === 'string' ? item : (item.label ?? item.value)

//                 return <SelectItem value={item.value}>{item.label}</SelectItem>
//             })}
//         </SelectContent>
//     </Select>
// }




/** NEW VERSION **/

export type AVFormControlProps<TInput = any, TOutput = TInput> = Partial<ControllerRenderProps<FieldValues, any>> & {
    value: TInput
    onChange: (value: TOutput) => void
}

export type AVFormControl<TInput = any, TOutput = TInput> = React.ComponentType<AVFormControlProps<TInput, TOutput>>;

export type AVFormFieldProps<TInput = any, TOutput = TInput> = {
    name: string,
    label?: string,
    description?: string,
    defaultValue?: TOutput,
    disabled?: boolean,
    control: AVFormControl<TInput, TOutput>,
    variant?: "default" | "row"
}


export function AVFormField<TInput = any, TOutput = TInput>(props: AVFormFieldProps<TInput, TOutput>) {
    const Control = props.control;
    const variant = props.variant ?? "default";

    return <FormField
        name={props.name}
        disabled={props.disabled}
        defaultValue={props.defaultValue}
        render={({ field }) => {
            if (variant === "row") {
                return <FormItem className="flex flex-row gap-4 items-start space-y-0">
                    {props.label && (
                        <FormLabel className="text-sm text-gray-600 w-[160px] flex-shrink-0 pt-1 truncate">
                            {props.label}
                        </FormLabel>
                    )}
                    <div className="flex-1 flex flex-col gap-1">
                        <Control {...field} />
                        {props.description && <FormDescription>
                            {props.description}
                        </FormDescription>}
                        <FormMessage />
                    </div>
                </FormItem>
            }

            return <FormItem>
                {props.label && <FormLabel>{props.label}</FormLabel>}
                <Control {...field} />
                {props.description && <FormDescription>
                    {props.description}
                </FormDescription>}
                <FormMessage />
            </FormItem>
        }}
    />
}


export const AVInput = ({ value, onChange, name, ...inputProps }: React.ComponentProps<"input"> & AVFormControlProps<string | undefined>) => {
    return <FormControl>
        <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
            name={name}
            {...inputProps}
        />
    </FormControl>
}

export const AVTextarea = ({ value, onChange, name, ...textareaProps }: React.ComponentProps<"textarea"> & AVFormControlProps<string | undefined>) => {
    return <FormControl>
        <Textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            name={name}
            {...textareaProps}
        />
    </FormControl>
}

export type AVSelectProps = AVFormControlProps<string | undefined> & {
    options: SelectControlOption[];
    placeholder?: string;
}

export const AVSelect = ({ value, onChange, options, placeholder = "Select an option..." }: AVSelectProps) => {
    return <FormControl>
        <Select value={value ?? ""} onValueChange={(newValue) => {
            onChange(newValue === "" ? undefined : newValue);
        }}>
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.icon && <span className="mr-2">{option.icon}</span>}
                        {option.label ?? option.value}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </FormControl>
}

export type AVFormHelperField<TValue extends z.ZodTypeAny = any, TInput = any, TOutput = TInput> = AVFormFieldProps<TInput, TOutput> & {
    defaultValue?: z.infer<TValue>
}

export type AVFormHelperOptions = {
    cancellable?: boolean
}

/**
 * TODO:
 * 
 * Create abstraction over useForm!!!
 * - no zodResolver
 * - take input errors into account (from backend)
 * - potentially no extra wrapper (<Form> and <form>, onsubmit taken into account)
 * 
 * Add cancellable
 * Create good input message control
 */

type AVFormProps = InputComponentProps & {
    defaultValues?: Record<string, any>,
    className?: string,
    children?: ReactNode,
}

export function AVForm(props: AVFormProps) {
    const { schema, defaultValues, submit, children } = props;

    const form = useForm({
        resolver: zodResolver<any, any, any>(schema),
        defaultValues
    })

    return <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className={cn("space-y-4", props.className)}>
            {children}
        </form>
    </Form>
}


export function AVFormError(props: { className?: string, error: BaseError }) {
    return <Alert variant="destructive" className={cn("", props.className)}>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription>{props.error.message}</AlertDescription>
    </Alert>
}


export function UserMessageInputComponent(props: InputComponentProps & { placeholder?: string }) {
    const [value, setValue] = useState<string>("");

    return <form onSubmit={(e) => {
        e.preventDefault();
        props.submit(value);
    }}>
        <InputGroup>
            <InputGroupTextarea placeholder={props.placeholder ?? "Enter your message..."} rows={2} className="min-h-0 pb-0 md:text-md" value={value} onChange={(e) => setValue(e.target.value)} />

            <InputGroupAddon align="block-end">

                {/* <InputGroupText className="ml-auto">52% used</InputGroupText>
      <Separator orientation="vertical" className="!h-4" /> */}
                <InputGroupButton
                    variant="default"
                    className={`rounded-full ml-auto ${props.isRunning ? "hidden" : ""}`}
                    size="icon-sm"
                    type="submit"
                    disabled={props.isRunning || value.trim() === ""}
                >
                    <ArrowUpIcon />
                    <span className="sr-only">Send</span>
                </InputGroupButton>

                <InputGroupButton
                    variant="default"
                    className={`rounded-full ml-auto ${!props.isRunning ? "hidden" : ""}`}
                    size="icon-sm"
                    onClick={() => {
                        props.cancel();
                    }}
                >
                    <PauseIcon />
                    <span className="sr-only">Pause</span>
                </InputGroupButton>

            </InputGroupAddon>
        </InputGroup>

    </form>
}



export function SingleControlForm<TSchema extends z.ZodTypeAny>(props: FormComponentProps<TSchema> & { controlComponent: ControlComponent<z.infer<TSchema>> }) {
    const [value, setValue] = useState<z.infer<TSchema> | null>(props.value ?? null);

    useEffect(() => {
        setValue(props.value ?? null);
    }, [props.value]);

    const Control = props.controlComponent;

    return <form>
        <Control
            name="value"
            value={value}
            onChange={(newValue) => {
                setValue(newValue);
                props.submit(newValue);
            }}
        />
    </form>
}

export function singleControlForm<TSchema extends z.ZodTypeAny>(controlComponent: ControlComponent<z.infer<TSchema>>) {
    return (props: FormComponentProps<TSchema>) => {
        return <SingleControlForm {...props} controlComponent={controlComponent} />
    }
}
