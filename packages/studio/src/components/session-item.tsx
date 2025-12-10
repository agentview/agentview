import type { AgentInputComponentProps, FormComponentProps, SessionItemDisplayComponentProps } from "agentview/types";
import { marked } from "marked";
import { cn } from "../lib/utils";
import { useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "./ui/input-group";
import { ArrowUpIcon, PauseIcon } from "lucide-react";
import { z } from "zod";

export function Markdown({ text, isMuted }: { text: string, isMuted?: boolean }) {
    return <div
        className={cn("prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline text-foreground", isMuted && "text-muted-foreground text-sm")}
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

export function TestItem({ value, title }: { value: string | any, title?: string }) {
    const content = typeof value === "string" ?
        <Markdown text={value} isMuted={true} /> :
        <pre className="text-xs overflow-x-scroll bg-gray-50 p-3 rounded-md">{JSON.stringify(value, null, 2)}</pre>;

    return <div className={"px-3 py-2 rounded-lg bg-gray-50"}>
        {title && (
            <div className="text-sm text-black mb-1 font-medium">
                {title}
            </div>
        )}

        <div className="text-sm">
            {content}
        </div>
    </div>
}

export function UserMessage({ value }: { value: string }) {
    return <BaseItem value={value} variant="outline" />
}

export function AssistantMessage({ value }: { value: string }) {
    return <BaseItem value={value} variant="default" />
}

export function StepItem({ value }: SessionItemDisplayComponentProps<any>) {
    // const title = role ? `${type} · ${role}` : type
    return <BaseItem value={value} variant="muted" />
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
