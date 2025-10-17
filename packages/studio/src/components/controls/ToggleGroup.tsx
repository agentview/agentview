import type { ControlComponentProps } from "../../types";
import { Button } from "../ui/button";
import { type Option, optionValueToString } from "./Option";

// fixme: totally not accessible
export const ToggleGroupControl = <T extends string | number | boolean = string>(props: ControlComponentProps<T> & { options: Option<T>[], hideOptionsOnSelect?: boolean, showLabels?: "always" | "on-select" | "never" }) => {
    const { value, onChange, options, hideOptionsOnSelect, showLabels = "always" } = props;

    return <div className="flex flex-row">
        {options.map((option) => {
            const isSelected = value === option.value;

            if (hideOptionsOnSelect && value !== null && value !== undefined && !isSelected) {
                return null;
            }

            const body = <>
                {option.icon}
                {showLabels === "always" && option.label}
                {showLabels === "on-select" && isSelected && option.label}
            </>

            const onClick = () => {
                if (isSelected) {
                    onChange(null);
                } else {
                    onChange(option.value);
                }
            }

            const stringValue = optionValueToString(option.value);

            return <Button
                key={stringValue}
                type="button"
                variant="ghost"
                size="sm"
                value={stringValue}
                className={`${isSelected ? "[&>svg]:fill-current [&>svg]:stroke-none" : ""}`}
                onClick={onClick}

            >
                {body}
            </Button>
        })}
    </div>
}