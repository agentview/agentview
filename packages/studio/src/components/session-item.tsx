import React from "react";
import type { AgentInputComponentProps, FormComponentProps, SessionItemDisplayComponentProps } from "agentview/types";
import { marked } from "marked";
import { cn } from "../lib/utils";
import { useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "./ui/input-group";
import { ArrowUpIcon, PauseIcon } from "lucide-react";
import { z } from "zod";
import { cva, type VariantProps } from "class-variance-authority";


const itemCardVariants = cva(
    "",
    {
        variants: {
            variant: {
                default:
                    "",
                outline:
                    "px-3 py-2 rounded-lg border",
                fill:
                    "px-3 py-2 rounded-lg bg-gray-50",
            },
            size: {
                default: "text-md",
                sm: "text-sm"
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

type ItemCardVariant = VariantProps<typeof itemCardVariants>["variant"];
type ItemCardSize = VariantProps<typeof itemCardVariants>["size"];


const ItemCardContext = React.createContext<{ variant: ItemCardVariant, size: ItemCardSize } | undefined>(undefined);

export function ItemCard({
    variant,
    size,
    className,
    children,
    ...props
}: VariantProps<typeof itemCardVariants> & React.ComponentProps<"div">) {
    return (
        <ItemCardContext.Provider value={{ variant, size }}>
            <div className={cn(itemCardVariants({ variant, size }), className)} {...props}>
                {children}
            </div>
        </ItemCardContext.Provider>
    );
}

export function ItemCardTitle({ className, children, ...props }: React.ComponentProps<"div">) {
    const context = React.useContext(ItemCardContext);
    const size = context?.size ?? "default";

    return (
        <div
            className={cn(
                "text-muted-foreground font-normal flex items-center",
                size === "sm" ? "gap-1 mb-1" : "gap-1.5 mb-0.5",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0",
                size === "sm" ? "[&_svg:not([class*='size-'])]:size-3" : "[&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function ItemCardContent({ className, children, ...props }: React.ComponentProps<"div"> & { children: React.ReactNode }) {
    return <div className={cn("", className)} {...props}>
        {children}
    </div>
}

export function ItemCardMarkdown({ text, className, ...props }: { text: string, className?: string } & React.ComponentProps<"div">) {
    const context = React.useContext(ItemCardContext);
    const size = context?.size ?? "default";

    return <div
        className={cn("prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline text-foreground", size === "sm" ? "text-sm" : "text-md", className)}
        {...props}
        dangerouslySetInnerHTML={{ __html: marked.parse(text, { async: false }) }}
    ></div>
}

export function ItemCardJSON({ value, className, ...props }: { value: any, className?: string } & React.ComponentProps<"pre">) {
    const context = React.useContext(ItemCardContext);
    const variant = context?.variant ?? "default";
    const size = context?.size ?? "default";

    return <pre className={cn(
        "overflow-x-scroll bg-gray-50 m-0",
        variant === "fill" ? "" : "p-3 rounded-md",
        size === "sm" ? "text-xs" : "text-sm",
        className)}
        {...props}
    >
        {JSON.stringify(value, null, 2)}
    </pre>
}


export function ItemCardAutoContent({ children }: { children: React.ReactNode }) {
    const isText = typeof children === "string";
    const isPlainObject = typeof children === "object" && children !== null && !Array.isArray(children) && !React.isValidElement(children);
    const isSthElse = !isText && !isPlainObject;

    return <ItemCardContent>
        { isPlainObject && <ItemCardJSON value={children} /> }
        { isText && <ItemCardMarkdown text={children} /> }
        { isSthElse && children }
    </ItemCardContent>
}

export function UserMessage({ children, className, size, ...props }: { children: React.ReactNode, className?: string, size?: ItemCardSize } & React.ComponentProps<"div">) {
    return <ItemCard variant="outline" className={className} size={size} {...props}>
        <ItemCardAutoContent>{children}</ItemCardAutoContent>
    </ItemCard>
}

export function AssistantMessage({ children, className, size, ...props }: { children: React.ReactNode, className?: string, size?: ItemCardSize } & React.ComponentProps<"div">) {
    return <ItemCard variant="default" className={className} size={size} {...props}>
        <ItemCardAutoContent>{children}</ItemCardAutoContent>
    </ItemCard>
}

export function StepItem({ children, className, size = "sm", ...props }: { children: React.ReactNode, className?: string, size?: ItemCardSize } & React.ComponentProps<"div">) {
    return <ItemCard variant="fill" className={className} size={size} {...props}>
        <ItemCardAutoContent>{children}</ItemCardAutoContent>
    </ItemCard>
}



// export function BaseItem({ variant = "default", value, title }: { variant?: "default" | "outline" | "muted", value: string | any, title?: string }) {
//     const content = typeof value === "string" ?
//         <Markdown text={value} /> :
//         <pre className="text-xs overflow-x-scroll bg-gray-50 p-3 rounded-md">{JSON.stringify(value, null, 2)}</pre>;

//     return <div className={variant === "outline" ? "border px-3 py-2 rounded-lg bg-white" : ""}>
//         {title && (
//             <div className="text-sm text-black mb-1 font-medium">
//                 {title}
//             </div>
//         )}

//         {content}
//     </div>
// }

// export function TestItem({ value, title }: { value: string | any, title?: string }) {
//     const content = typeof value === "string" ?
//         <Markdown text={value} /> :
//         <pre className="text-xs overflow-x-scroll bg-gray-50 p-3 rounded-md">{JSON.stringify(value, null, 2)}</pre>;

//     return <div className={"px-3 py-2 rounded-lg bg-gray-50"}>
//         {title && (
//             <div className="text-sm text-black mb-1 font-medium">
//                 {title}
//             </div>
//         )}

//         <div className="text-sm">
//             {content}
//         </div>
//     </div>
// }

// export function UserMessage({ value }: { value: string }) {
//     return <BaseItem value={value} variant="outline" />
// }

// export function AssistantMessage({ value }: { value: string }) {
//     return <BaseItem value={value} variant="default" />
// }

// export function StepItem({ value }: SessionItemDisplayComponentProps<any>) {
//     // const title = role ? `${type} · ${role}` : type
//     return <BaseItem value={value} variant="muted" />
// }

// export function UserMessageOutline() {

// }

export function UserMessageInput(props: { isRunning: boolean, onCancel: () => void, onSubmit: (value: string) => void, placeholder?: string }) {
    const [value, setValue] = useState<string>("");

    return <form onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit(value);
    }}>
        <InputGroup>
            <InputGroupTextarea placeholder={props.placeholder ?? "Enter your message..."} rows={2} className="min-h-0 pb-0 md:text-md" value={value} onChange={(e) => setValue(e.target.value)} />

            <InputGroupAddon align="block-end">
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
                        props.onCancel();
                    }}
                >
                    <PauseIcon />
                    <span className="sr-only">Pause</span>
                </InputGroupButton>

            </InputGroupAddon>
        </InputGroup>

    </form>
}
