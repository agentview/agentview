import type { SessionItemDisplayComponentProps } from "~/types";
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

export function UserMessage({ value }: SessionItemDisplayComponentProps<any>) {
    return <BaseItem value={value} variant="outline" />
}

export function AssistantMessage({ value }: SessionItemDisplayComponentProps<any>) {
    return <BaseItem value={value} variant="default" />
}

export function StepItem({ value, type, role }: SessionItemDisplayComponentProps<any>) {
    const title = role ? `${type} · ${role}` : type
    return <BaseItem value={value} variant="muted" title={title} />
}
