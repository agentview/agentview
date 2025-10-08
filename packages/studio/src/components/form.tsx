import { useState, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useOnFormReset } from '~/hooks/useOnFormReset';
import type { ControlComponent, ControlComponentProps, FormInputProps, InputComponent, InputComponentProps } from "~/types";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import {
    ToggleGroup,
    ToggleGroupItem,
} from "./ui/toggle-group"
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FormDescription, FormItem, FormLabel, FormMessage, useFormField, FormField as FormFieldShadcn, FormControl } from "./ui/form";
import React from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";


import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "./ui/form";
import { Alert } from "./ui/alert";
import { AlertCircleIcon, ArrowUpIcon, Loader2, PauseIcon, PlusIcon, StopCircleIcon } from "lucide-react";
import { AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { z } from "zod";
import type { BaseError } from "~/lib/errors";
import { cn } from "~/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from "./ui/input-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

// AVFormContext
const AVFormContext = createContext<InputComponentProps | null>(null);

function useAVFormContext() {
    return useContext(AVFormContext);
}

export type FormFieldBaseProps = {
    id: string,
    children: ReactNode
    label?: string;
    description?: string;
    error?: string;
};

export function FormFieldBase<T = any>(props: FormFieldBaseProps) {
    const { id, label, description, error, children } = props;
    return <div className="flex flex-row gap-4">
        {label && <label className="text-sm text-gray-700 w-[170px] flex-shrink-0 truncate" htmlFor={id}>{label}</label>}
        {<div className="flex-1">
            <div>
                {children}
            </div>
            {description && <div className="text-xs text-gray-500">{description}</div>}
            {error && <div className="text-xs text-red-500">{error}</div>}
        </div>}
    </div>
}

export type FormFieldProps<T = any> = Omit<FormFieldBaseProps, "children"> & {
    name: string,
    defaultValue: T,
    options?: any,
    InputComponent: React.ComponentType<FormInputProps<T>>,
}

export function FormField<T = any>(props: FormFieldProps<T>) {
    const { id, label, description, error, name, defaultValue, InputComponent, options } = props;
    const [fieldValue, setFieldValue] = useState<T>(defaultValue);

    const inputRef = useOnFormReset(() => {
        setFieldValue(defaultValue);
    });

    // const [fieldError, setFieldError] = useState<string | undefined>(error);

    // useEffect(() => {
    //     setFieldError(error);
    // }, [error]);

    return <>
        <input type="hidden" name={name} value={JSON.stringify(fieldValue) ?? ""} ref={inputRef} />
        <FormFieldBase id={id} label={label} description={description} error={error}>
            <InputComponent id={id} name={`agentview__${name}`} value={fieldValue} options={options} onChange={(newValue) => {
                setFieldValue(newValue);
                // setFieldError(undefined);
            }} />
        </FormFieldBase>
    </>
}

export const TextInput: React.ComponentType<FormInputProps<string | undefined>> = ({ value, onChange, name, id }) => {
    return <Input value={value ?? ""} placeholder={"Enter value"} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} name={name} id={id} />
}

export const TextareaInput: React.ComponentType<FormInputProps<string | undefined>> = ({ value, onChange, name, id }) => {
    return <Textarea value={value ?? ""} placeholder={"Enter value"} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} name={name} id={id} />
}

export const SwitchInput: React.ComponentType<FormInputProps<boolean>> = ({ value, onChange, name, id }) => {
    return <Switch checked={value ?? false} onCheckedChange={(checked) => onChange(checked)} name={name} id={id} />
}





// Toggle Buttons

export type ToggleGroupControlOption = {
    value: string;
    icon?: React.ReactNode;
    label?: string;
}

export const ToggleGroupControl = ({ value, onChange, options } : ControlComponentProps<string> & { options: ToggleGroupControlOption[] }) => {
    const toggleValue = value ?? "";

    return (
        <ToggleGroup type="single" variant="outline" size="sm" value={toggleValue} onValueChange={(value) => {
            if (value === "") {
                onChange(undefined);
            } else {
                onChange(value);
            }
        }}>
            {options.map((option) => {
                const icon = option.icon;
                const label = icon ? null : (option.label ?? option.value);

                return (
                    <ToggleGroupItem key={option.value} value={option.value} aria-label={`Toggle ${option.value}`}>
                        {icon}
                        {label}
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    )
}

export function ToogleGroupDisplay({ value, options }: { value: string, options: ToggleGroupControlOption[] }) {
    const option = options.find(opt => opt.value === value);

    if (!option) {
        return <div className="text-sm text-muted-foreground">Undefined</div>;
    }

    return (
        <Badge variant="default" className="text-xs flex items-center gap-1">
            {option.icon}
            {option.label}
        </Badge>
    );
}

export type BooleanToggleGroupOptions = {
    trueLabel?: string;
    trueIcon?: React.ReactNode;
    falseLabel?: string;
    falseIcon?: React.ReactNode;
}

export type BooleanToggleGroupControlProps = ControlComponentProps<boolean> & BooleanToggleGroupOptions

export const BooleanToggleGroupControl = ({ value, onChange, trueLabel, trueIcon, falseLabel, falseIcon }: BooleanToggleGroupControlProps) => {
    const options: ToggleGroupControlOption[] = [
        {
            value: "true",
            label: trueLabel,
            icon: trueIcon
        },
        {
            value: "false",
            label: falseLabel,
            icon: falseIcon
        }
    ];

    const stringValue = value === true ? "true" : value === false ? "false" : undefined;

    console.log('string value', stringValue);

    return (
        <ToggleGroupControl
            value={stringValue}
            onChange={(newValue) => {
                console.log('on change', newValue);
                
                if (newValue === undefined) {
                    onChange(undefined);
                } else {
                    onChange(newValue === "true");
                }
            }}
            options={options}
        />
    );
}

export function BooleanToggleGroupDisplay({ value, trueLabel, trueIcon, falseLabel, falseIcon }: { value: boolean } & BooleanToggleGroupOptions) {
    const options: ToggleGroupControlOption[] = [
        {
            value: "true",
            label: trueLabel,
            icon: trueIcon
        },
        {
            value: "false",
            label: falseLabel,
            icon: falseIcon
        }
    ];
    return <ToogleGroupDisplay value={value ? "true" : "false"} options={options} />
}





// export const ToggleBooleanInput: ControlComponent<boolean> = ({ value, onChange }) => {
//     const toggleValue = value === true ? "true" : value === false ? "false" : "";

//     const TrueIcon = options?.true?.icon ?? null;
//     const trueLabel = TrueIcon ? null : options?.true?.label ?? "True";

//     const FalseIcon = options?.false?.icon ?? null;
//     const falseLabel = FalseIcon ? null : options?.false?.label ?? "False";

//     return (
//         <ToggleGroup type="single" variant="outline" size="sm" value={toggleValue} onValueChange={(value) => {
//             if (value === "") {
//                 onChange(undefined);
//             } else {
//                 onChange(value === "true");
//             }
//         }}>
//             <ToggleGroupItem value="true" aria-label="Toggle true">
//                 {TrueIcon ? <TrueIcon className="h-2 w-2" /> : null}
//                 {trueLabel}
//             </ToggleGroupItem>
//             <ToggleGroupItem value="false" aria-label="Toggle false">
//                 {FalseIcon ? <FalseIcon className="h-2 w-2" /> : null}
//                 {falseLabel}
//             </ToggleGroupItem>
//         </ToggleGroup>
//     )
// }

export const SelectInput: React.ComponentType<FormInputProps<string | undefined>> = ({ value, onChange, name, id, options }) => {
    return <Select onValueChange={(value) => onChange(value === "" ? undefined : value)} defaultValue={value}>
        <SelectTrigger>
            <SelectValue placeholder="Pick option" />
        </SelectTrigger>
        <SelectContent>
            {options.items.map((item: any) => {
                const value = typeof item === 'string' ? item : item.value;
                const label = typeof item === 'string' ? item : (item.label ?? item.value)

                return <SelectItem value={item.value}>{item.label}</SelectItem>
            })}
        </SelectContent>
    </Select>
}

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
    control: AVFormControl<TInput, TOutput>
}


export function AVFormField<TInput = any, TOutput = TInput>(props: AVFormFieldProps<TInput, TOutput>) {
    const Control = props.control;

    return <FormFieldShadcn
        name={props.name}
        disabled={props.disabled}
        defaultValue={props.defaultValue}
        render={({ field }) => {
            return <FormItem>
                <FormLabel>{props.label ?? props.name}</FormLabel>
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
    console.log('AVInput value', value);
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

// export type AVFormSubmitButtonProps = React.ComponentProps<typeof Button>;

// export function AVFormSubmitButton(props: AVFormSubmitButtonProps) {
//     const formContext = useAVFormContext();
//     const isRunning = formContext?.isRunning ?? false;

//     const shouldShowIcon = !props.children || typeof props.children === "string";

//     return (
//         <Button
//             type={"submit"}
//             disabled={props.disabled || isRunning}
//             className={cn("transition-colors", props.className)}
//             {...props}
//         >
//             {shouldShowIcon && isRunning && <Loader2 className="animate-spin" />}
//             {props.children ?? "Submit"}
//         </Button>
//     )
// }


// export function singleFieldForm(field: { defaultValue: any, control: any }): InputComponent {
//     const { defaultValue, ...fieldProps } = field;
//     const Control = field.control;

//     return ({ submit, error, schema, isRunning }) => {
//         const form = useForm({
//             resolver: zodResolver<any, any, any>(z.object({ value: schema })),
//             defaultValues: {
//                 value: defaultValue
//             }
//         })

//         return <Form {...form}>
//             {error && <Alert variant="destructive" className="mb-4">
//                 <AlertCircleIcon className="h-4 w-4" />
//                 <AlertDescription>{error.message}</AlertDescription>
//             </Alert>}
//             <form onSubmit={form.handleSubmit((values) => submit(values.value))} className="space-y-2">
//                 <FormFieldShadcn
//                     name={"value"}
//                     render={({ field }) => {
//                         return <FormItem>
//                             <Control {...field} />
//                         </FormItem>
//                     }}
//                 />
//                 <Button type="submit" disabled={isRunning}>{isRunning ? 'Submitting...' : 'Submit'}</Button>
//             </form>
//         </Form>
//     }
// }



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