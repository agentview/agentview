import type { Color } from "agentview/colors";

export type Option<T extends string | number | boolean> = {
    value: T;
    icon?: React.ReactNode;
    label?: string;
    color?: Color | string;
}

export function optionValueToString(value: string | number | boolean) {
    return String(value);
}

export function optionStringToValue<T extends string | number | boolean>(value: string, options: Option<T>[]): T {
    for (const option of options) {
        if (String(option.value) === value) {
            return option.value;
        }
    }
    throw new Error(`Value '${value}' not found in options`);
}