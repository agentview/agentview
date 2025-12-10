import { FormDescription, FormItem, FormLabel, FormMessage, FormField, FormControl } from "../ui/form";
import React from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import { Alert } from "../ui/alert";
import { AlertCircleIcon, ArrowUpIcon, ChevronDownIcon, PauseIcon, ThumbsDown, ThumbsUp } from "lucide-react";
import { AlertDescription } from "../ui/alert";
import type { BaseError } from "../../lib/errors";
import { cn } from "../../lib/utils";


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
                        <FormLabel className="text-sm text-gray-600 w-[160px] flex-shrink-0 pt-1.5 truncate">
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

export function AVFormError(props: { className?: string, error: BaseError }) {
    return <Alert variant="destructive" className={cn("", props.className)}>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription>{props.error.message}</AlertDescription>
    </Alert>
}

