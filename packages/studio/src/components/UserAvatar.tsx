import { cn } from "~/lib/utils";
import { Colors, type Color } from "~/lib/shared/colors";

const sizeMap = {
    sm: {
        containerSize: "size-[20px]",
        fontSize: "10px"
    },
    md: {
        containerSize: "size-[24px]",
        fontSize: "12px"
    }
}

const defaultColor = "var(--color-gray-100)";

export function UserAvatar({ image, className, size = "md" }: { image: string | undefined | null, className?: string, size?: "sm" | "md" }) {
    let color = defaultColor;
    let letter: string = "";

    if (typeof image === "string" && image.startsWith("color:")) {
        const parts = image.split(":");
        if (parts.length === 3 && parts[1] && parts[2]) {
            color = Colors[parts[1] as Color] ?? defaultColor;
            letter = parts[2];
        }
    }

    const sizeConfig = sizeMap[size];

    return <div 
        className={cn(`relative ${sizeConfig.containerSize} rounded-full flex justify-center items-center text-black`, className)}
        style={{ backgroundColor: color }}
    >
        <span style={{ fontSize: sizeConfig.fontSize, lineHeight: 1, opacity: 0.66, marginTop: "1px" }}>
            {letter?.charAt(0).toUpperCase()}
        </span>
    </div>
}
