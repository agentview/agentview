import type { DisplayComponentProps } from "~/types";
import { marked } from "marked";
import { cn } from "~/lib/utils";

export function Markdown({ text, isMuted }: { text: string, isMuted?: boolean }) {
    return <div
        className={cn("prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline", isMuted && "text-muted-foreground")}
        dangerouslySetInnerHTML={{ __html: marked.parse(text, { async: false }) }}
    ></div>
}

export function BaseItem({ variant = "default", value, title }: { variant?: "default" | "outline" | "muted", value: string | any, title?: string }) {
    const content = typeof value === "string" ?
        <Markdown text={value} isMuted={variant === "muted"} /> :
        <pre className="text-xs overflow-x-scroll bg-gray-50 p-3 rounded-md">{JSON.stringify(value, null, 2)}</pre>;

    return <div className={variant === "outline" ? "border px-3 py-2 rounded-lg bg-white" : ""}>
        {title && (
            <div className="text-sm text-black mb-1 font-medium">
                {title}
            </div>
        )}

        {content}
    </div>
}

export function UserMessage({ value }: DisplayComponentProps<string>) {
    return <div className="border p-3 rounded-lg bg-white">
        <Markdown text={value} />
    </div>
}

export function AssistantMessage({ value }: DisplayComponentProps<string>) {
    return <Markdown text={value} />
}

export function AssistantMessage2({ value, title }: DisplayComponentProps<string> & { title?: string }) {
    return (<div>
        <div className="">
            {title && (
                <div className="text-sm text-black mb-0.5 font-medium">
                    {title}
                </div>
            )}
            <div
                className="prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: marked.parse(value, { async: false }) }}
            ></div>
        </div>

        <div className=" mt-4">
            {title && (
                <div className="text-sm text-black mb-0.5 font-medium">
                    tool_call
                </div>
            )}
            <div
                className="prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline text-muted-foreground "
                dangerouslySetInnerHTML={{ __html: marked.parse("Something something", { async: false }) }}
            ></div>
        </div>

    </div>);
}
