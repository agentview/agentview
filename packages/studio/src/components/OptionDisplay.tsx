import { Pill } from "./Pill";
import { type Option } from "./Option";

export function OptionDisplay<T extends string | number | boolean = string>({ value, options }: { value: T, options: Option<T>[] }) {
    const option = options.find(opt => opt.value === value);

    if (!option) {
        return <div className="text-sm text-muted-foreground">Undefined</div>;
    }

    return (
        <Pill size="xs" color={option.color}>
            {option.icon}
            {option.label ?? option.value}
        </Pill>
    );
}
