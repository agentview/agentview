import type { DisplayComponentProps } from "~/types";
import { Badge } from "./ui/badge";
import { marked } from "marked";

// export function DisplayTextComponent({ value, options }: DisplayComponentProps<string>) {
//     return <div className="text-sm">{value}</div>
// }


// export function DisplayBooleanComponent({ value, options }: DisplayComponentProps<boolean>) {
//     if (value === true) {
//         const TrueIcon = options?.true?.icon ?? null;
//         const trueLabel = options?.true?.label ?? null;

//         return (
//             <Badge variant="default" className="text-xs">
//                 {TrueIcon && <TrueIcon className="h-3 w-3" />}
//                 {trueLabel}
//             </Badge>
//         );
//     } else if (value === false) {
//         const FalseIcon = options?.false?.icon ?? null;
//         const falseLabel = options?.false?.label ?? null;

//         return (
//             <Badge variant="secondary" className="text-xs">
//                 {FalseIcon && <FalseIcon className="h-3 w-3" />}
//                 {falseLabel}
//             </Badge>
//         );
//     }
//     else {
//         return <div className="text-sm">Undefined</div>
//     }
// }

function newLinesIntoBr(text: string) {
    return text
        .split('\n')
        .map(line => line.trim())
        .join('<br>')
}


export function ItemUserMessageComponent({ value }: DisplayComponentProps<string>) {
    return <div className="relative pl-[10%]">
        <div className="border p-3 rounded-lg bg-white">
            <div
                dangerouslySetInnerHTML={{
                    __html: newLinesIntoBr(value)
                }}
            ></div>
        </div>
    </div>
}

// export function ItemAssistantMessageComponent({ value, options }: DisplayComponentProps<string>) {
//     return <div className="relative pr-[10%]">
//         <div className="border p-3 rounded-lg bg-muted">
//             <div className="prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline" dangerouslySetInnerHTML={{__html: marked.parse(value, { async: false })}}></div>
//         </div>
//     </div>
// }

export function ItemAssistantMessageComponent({ value }: DisplayComponentProps<string>) {
    return <div className="prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline" dangerouslySetInnerHTML={{__html: marked.parse(value, { async: false })}}></div>
}

export function ItemAssistantMessageComponentWithTitle({ value, title }: DisplayComponentProps<string> & { title?: string }) {
    return (<div>
        {/* <div className="flex items-stretch border-b pb-2 pt-2">
            <div className="flex flex-col items-center pr-4 relative">
                <div className="size-2 rounded-full bg-gray-500 mb-1 mt-1"></div>
                <div className="flex-1 w-px bg-gray-300 grow"></div>
            </div>
            <div className="flex-1 ">
                {title && (
                    <div className="text-sm text-muted-foreground mb-1 font-medium">
                        {title}
                    </div>
                )}
                <div
                    className="prose prose-ul:list-disc prose-ol:list-decimal prose-a:underline text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: marked.parse(value, { async: false }) }}
                ></div>
            </div>
        </div> */}
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
