import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpIcon, ChevronDownIcon, PauseIcon } from "lucide-react";
import { marked } from "marked";
import React, { useState } from "react";
import { cn } from "../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "./ui/input-group";


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
                    "px-3 py-2 rounded-lg bg-gray-100",
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


const ItemCardContext = React.createContext<{ variant: ItemCardVariant, size: ItemCardSize, collapsible: boolean } | undefined>(undefined);

export function ItemCard({
    variant,
    size,
    collapsible = false,
    defaultOpen = false,
    className,
    children,
    ...props
}: VariantProps<typeof itemCardVariants> & React.ComponentProps<"div"> & { collapsible?: boolean, defaultOpen?: boolean }) {
    const content = (
        <ItemCardContext.Provider value={{ variant, size, collapsible }}>
            <div className={cn(itemCardVariants({ variant, size }), className)} {...props}>
                {children}
            </div>
        </ItemCardContext.Provider>
    );

    if (collapsible) {
        return <Collapsible defaultOpen={defaultOpen} className="group">{content}</Collapsible>;
    }

    return content;
}

export function ItemCardTitle({ className, children, ...props }: React.ComponentProps<"div">) {
    const context = React.useContext(ItemCardContext);
    const size = context?.size ?? "default";
    const collapsible = context?.collapsible ?? false;

    const content = (
        <div
            className={cn(
                "text-muted-foreground font-normal flex items-center",
                size === "sm" ? "gap-1" : "gap-1.5",
                collapsible
                    ? (size === "sm" ? "group-data-[state=open]:mb-1" : "group-data-[state=open]:mb-0.5")
                    : (size === "sm" ? "mb-1" : "mb-0.5"),
                "[&_svg]:pointer-events-none [&_svg]:shrink-0",
                size === "sm" ? "[&_svg:not([class*='size-'])]:size-3" : "[&_svg:not([class*='size-'])]:size-4",
                collapsible && "cursor-pointer select-none",
                className
            )}
            {...props}
        >
            {children}
            {collapsible && (
                <ChevronDownIcon className={cn(
                    "ml-auto transition-transform duration-200",
                    size === "sm" ? "size-3" : "size-4",
                    "group-data-[state=open]:rotate-[-180deg]"
                )} />
            )}
        </div>
    );

    if (collapsible) {
        return <CollapsibleTrigger asChild>{content}</CollapsibleTrigger>;
    }

    return content;
}

export function ItemCardContent({ className, children, ...props }: React.ComponentProps<"div"> & { children: React.ReactNode }) {
    const context = React.useContext(ItemCardContext);
    const collapsible = context?.collapsible ?? false;

    const content = <div className={cn("", className)} {...props}>
        {children}
    </div>;

    if (collapsible) {
        return <CollapsibleContent>{content}</CollapsibleContent>;
    }

    return content;
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
    return <ItemCard variant="fill" className={className} size={size} {...props}>
        <ItemCardAutoContent>{children}</ItemCardAutoContent>
    </ItemCard>
}

export function AssistantMessage({ children, className, size, ...props }: { children: React.ReactNode, className?: string, size?: ItemCardSize } & React.ComponentProps<"div">) {
    return <ItemCard variant="default" className={className} size={size} {...props}>
        <ItemCardAutoContent>{children}</ItemCardAutoContent>
    </ItemCard>
}

export function StepItem({ children, className, size = "sm", ...props }: { children: React.ReactNode, className?: string, size?: ItemCardSize } & React.ComponentProps<"div">) {
    return <ItemCard variant="outline" className={className} size={size} {...props}>
        <ItemCardAutoContent>{children}</ItemCardAutoContent>
    </ItemCard>
}


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
