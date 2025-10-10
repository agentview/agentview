import { AlertCircleIcon, EllipsisVerticalIcon, Gauge, GaugeIcon, PencilIcon, PencilLineIcon, Reply, ReplyIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import type { SessionItem, CommentMessage, Session, User } from "~/lib/shared/apiTypes";
import { Button } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useFetcherSuccess } from "~/hooks/useFetcherSuccess";
import { timeAgoShort } from "~/lib/timeAgo";
import { AVFormField } from "./form";
import { PropertyList, PropertyListItem, PropertyListTextValue, PropertyListTitle } from "./PropertyList";
import { Alert, AlertDescription } from "./ui/alert";
import { TextEditor, textToElements } from "./TextEditor";
import { useSessionContext } from "~/lib/SessionContext";
import { apiFetch } from "~/lib/apiFetch";
import { config } from "~/config";
import { requireAgentConfig, requireItemConfig } from "~/lib/config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Form } from "./ui/form";
import React from "react";

export type CommentSessionProps = {
    session: Session,
    item: SessionItem,
    collapsed?: boolean,
    singleLineMessageHeader?: boolean,
    small?: boolean,
}

export type CommentSessionFloatingBoxProps = CommentSessionProps & {
    selected: boolean,
    onSelect: (item: any) => void,
}

export type CommentSessionFloatingButtonProps = CommentSessionFloatingBoxProps & {
    session: Session,
    item: SessionItem,
    onSelect: (item: any) => void,
}

function getAllScoreConfigs(session: Session, item: SessionItem) {
    const agentConfig = requireAgentConfig(config, session.agent);
    const itemConfig = requireItemConfig(agentConfig, item.type, item.role);
    return itemConfig?.scores || [];
}

export const CommentThread = forwardRef<any, CommentSessionProps>(({ session, item, collapsed = false, singleLineMessageHeader = false, small = false }, ref) => {
    const { members, user } = useSessionContext();
    const fetcher = useFetcher();

    const visibleMessages = item.commentMessages.filter((m: any) => !m.deletedAt) ?? []





    const hasZeroVisisbleComments = visibleMessages.length === 0

    const schema = z.object({
        comment: z.string()
    }).partial();

    const form = useForm({
        resolver: zodResolver(schema),
    });

    const submit = (data: z.infer<typeof schema>) => {
        fetcher.submit(data as any, { method: 'post', action: `/sessions/${session.id}/items/${item.id}/comments`, encType: 'application/json' })
    }

    useFetcherSuccess(fetcher, () => {
        form.reset();
    });

    useImperativeHandle(ref, () => ({
        reset: () => {
            form.reset();
        }
    }));

    return (<div ref={ref}>
        {visibleMessages.length > 0 && <div className={`flex flex-col gap-4 ${small ? "p-4" : "p-6"}`}>

            {/* Display comments */}
            {visibleMessages.map((message: any, index: number) => {
                const count = visibleMessages.length;

                let compressionLevel: MessageCompressionLevel = "none";

                if (message.deletedAt) {
                    return null
                }

                if (collapsed) {
                    if (count === 1) {
                        compressionLevel = "high"
                    }
                    else {
                        compressionLevel = "medium";
                        if (count >= 3 && index != 0 && index != count - 1) {

                            if (index === 1) {
                                return (
                                    <div className="flex items-center" key="separator">
                                        <hr className="flex-grow border-gray-300" />
                                        <span className="mx-2 text-xs text-muted-foreground px-2 rounded select-none">
                                            {count - 2} more comment{(count - 2) > 1 ? "s" : ""}
                                        </span>
                                        <hr className="flex-grow border-gray-300" />
                                    </div>
                                )
                            }
                            return null
                        }
                    }
                }

                return <CommentMessageItem
                    key={message.id}
                    message={message}
                    fetcher={fetcher}
                    item={item}
                    session={session}
                    compressionLevel={compressionLevel}
                    singleLineMessageHeader={singleLineMessageHeader}
                />
            })}

        </div>}

        {!collapsed && visibleMessages.length > 0 && <div className={`border-t ${small ? "px-3" : "px-4"} max-w-2xl`}></div>}

        {!collapsed && <div className={`max-w-2xl ${small ? "p-4" : "p-6"}`}>


            <div className="flex flex-row gap-2">


                <div className={`rounded-full bg-gray-300 flex-shrink-0`}
                    style={{ width: 24, height: 24 }}
                />

                <div className="flex-1">
                    {fetcher.state === 'idle' && fetcher.data?.ok === false && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircleIcon className="h-4 w-4" />
                            <AlertDescription>{fetcher.data.error.message}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submit)} className="space-y-2">
                            <div>
                                <AVFormField
                                    key={"comment"}
                                    name={"comment"}
                                    control={(props) => <TextEditor
                                        mentionItems={members.filter((member) => member.id !== user.id).map(member => ({
                                            id: member.id,
                                            label: member.name ?? "Unknown"
                                        }))}
                                        placeholder={(hasZeroVisisbleComments ? "Comment" : "Reply") + " or tag other, using @"}
                                        className="min-h-[10px] resize-none mb-0"
                                        {...props}
                                    />}
                                />
                            </div>
                            <div className={`gap-2 justify-end mt-2 flex`}>
                                <Button
                                    type="reset"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        form.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={fetcher.state !== 'idle'}
                                >
                                    {fetcher.state !== 'idle' ? 'Posting...' : 'Submit'}
                                </Button>
                            </div>


                        </form>
                    </Form>
                </div>


            </div>
        </div>}

    </div>
    );
});

export function CommentSessionFloatingBox({ session, item, selected = false, onSelect }: CommentSessionFloatingBoxProps) {
    const commentThreadRef = useRef<any>(null);
    const revalidator = useRevalidator();

    useEffect(() => {
        if (!selected) {
            commentThreadRef.current?.reset();
        }

        if (selected) {
            apiFetch(`/api/sessions/${session.id}/items/${item.id}/seen`, {
                method: 'POST',
            }).then((data) => {
                if (data.ok) {
                    revalidator.revalidate();
                }
                else {
                    console.error(data.error)
                }
            })
        }
    }, [selected])

    useEffect(() => {
        const handlePointerDownOutside = (e: PointerEvent) => {
            const target = e.target as Element | null;

            if (!target) return;

            const isClickingItem = target.closest('[data-item]');
            const isClickingComment = target.closest('[data-comment]');
            const isClickingPortal = target.closest('[data-radix-popper-content-wrapper]')

            // Deselect if clicking outside both item and comment areas
            if (!isClickingItem && !isClickingComment && !isClickingPortal) {
                onSelect(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDownOutside);
        return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
    }, []);

    return (
        <div className={`rounded-lg ${selected ? "bg-white border" : "bg-gray-50"}`} data-comment={true} onClick={(e) => {
            if (!selected) {
                onSelect(item)
            }
        }}>
            <CommentThread
                session={session}
                item={item}
                collapsed={!selected}
                ref={commentThreadRef}
                small={true}
                singleLineMessageHeader={true}
            />
        </div>
    );
}




export function CommentMessageHeader({ title, subtitle, actions, singleLineMessageHeader = false }: { title: string, subtitle?: string, actions?: React.ReactNode, singleLineMessageHeader?: boolean }) {

    if (singleLineMessageHeader) {
        return <div className="flex flex-row justify-between mb-1">

            <div className="flex flex-row items-center gap-2">
                <div className="rounded-full bg-gray-300 flex-shrink-0"
                    style={{ width: 24, height: 24 }}
                />
                <div className="text-sm font-medium">
                    {title}
                </div>
                <div className="text-xs text-gray-400">
                    {subtitle}
                </div>
            </div>
            {actions}
        </div>
    }

    return <div className="flex items-center gap-2 mb-1">
        {/* Thumbnail */}
        <div
            className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"
            style={{ width: 32, height: 32 }}
        />
        <div className="flex-1">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-sm font-medium ">
                        {title}
                    </div>
                    <div className="text-xs text-gray-400">
                        {subtitle}
                    </div>
                </div>
                {actions}
            </div>
        </div>
    </div>
}

type MessageCompressionLevel = "none" | "medium" | "high";

// New subcomponent for comment message item with edit logic
export function CommentMessageItem({ message, item, session, compressionLevel = "none", singleLineMessageHeader = false }: { message: CommentMessage, fetcher: any, item: SessionItem, session: Session, compressionLevel?: MessageCompressionLevel, singleLineMessageHeader?: boolean }) {
    if (message.deletedAt) {
        throw new Error("Deleted messages don't have rendering code.")
    }

    const { user, members } = useSessionContext();
    const author = members.find((m) => m.id === message.userId);
    if (!author) {
        throw new Error("Author not found");
    }

    const fetcher = useFetcher();
    const isOwn = author.id === user.id;

    const createdAt = timeAgoShort(message.createdAt);
    const subtitle = createdAt + (message.updatedAt && message.updatedAt !== message.createdAt ? " · edited" : "")

    const [isEditing, setIsEditing] = useState(false);


    // const allScoreConfigs = getAllScoreConfigs(session, item);

    // const scores: Record<string, any> = {};
    // for (const score of message.scores ?? []) {
    //     if (score.deletedAt !== null) {
    //         continue;
    //     }
    //     scores[score.name] = score.value;
    // }


    // const messageScoreConfigs = allScoreConfigs.filter(
    //     (scoreConfig) =>
    //         message.scores &&
    //         message.scores.some((score) => score.name === scoreConfig.name)
    // );

    const schema = z.object({
        comment: z.string(),
        // scores: z.object(
        //     Object.fromEntries(
        //         messageScoreConfigs.map((scoreConfig) => [
        //             scoreConfig.name,
        //             scoreConfig.schema.optional()
        //         ])
        //     )
        // )
    }).partial();

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            comment: message.content ?? undefined,
            // scores: scores
        }
    });

    const submit = (data: z.infer<typeof schema>) => {
        fetcher.submit(data as any, { method: 'put', action: `/sessions/${session.id}/items/${item.id}/comments/${message.id}`, encType: 'application/json' })
    }

    useFetcherSuccess(fetcher, () => {
        setIsEditing(false);
    });

    const scoreConfig = getAllScoreConfigs(session, item).find((scoreConfig) => scoreConfig.name === message.score?.name);

    return (
        <div>

            <CommentMessageHeader title={author.name ?? author.email} subtitle={subtitle} singleLineMessageHeader={singleLineMessageHeader} 
            // actions={
            //     isOwn && (<DropdownMenu>
            //         <DropdownMenuTrigger asChild>
            //             <Button size="icon" variant="ghost">
            //                 <EllipsisVerticalIcon className="w-4 h-4 text-gray-400" />
            //             </Button>
            //         </DropdownMenuTrigger>
            //         <DropdownMenuContent className="w-32" align="start">
            //             <DropdownMenuItem onClick={(e) => {
            //                 setIsEditing(true);
            //             }}>
            //                 Edit
            //             </DropdownMenuItem>
            //             <DropdownMenuItem onClick={(e) => {
            //                 e.preventDefault();
            //                 if (confirm('Are you sure you want to delete this comment?')) {
            //                     fetcher.submit(null, { method: 'delete', action: `/sessions/${session.id}/items/${item.id}/comments/${message.id}` }); // that could be fetcher.Form!
            //                 }
            //             }}>
            //                 Delete
            //             </DropdownMenuItem>
            //         </DropdownMenuContent>
            //     </DropdownMenu>
            //     )
            // }
             />

            {/* Comment content */}
            <div className="text-sm ml-8">
                {isEditing ? (<div>

                    {fetcher.state === 'idle' && fetcher.data?.ok === false && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircleIcon className="h-4 w-4" />
                            <AlertDescription>{fetcher.data.error.message}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submit)} className="space-y-2">
                            {/* {messageScoreConfigs.length > 0 && <div className="mb-4 space-y-2">
                                {messageScoreConfigs.map((scoreConfig) => (
                                    <AVFormField
                                        key={scoreConfig.name}
                                        label={scoreConfig.title ?? scoreConfig.name}
                                        name={"scores." + scoreConfig.name}
                                        control={scoreConfig.inputComponent}
                                    />
                                ))}
                            </div>} */}

                            <AVFormField
                                key={"comment"}
                                label={"Comment"}
                                name={"comment"}
                                control={(props) => <TextEditor
                                    mentionItems={members.filter((member) => member.id !== user.id).map(member => ({
                                        id: member.id,
                                        label: member.name ?? "Unknown"
                                    }))}
                                    placeholder={"Edit or tag others, using @"}
                                    className="min-h-[10px] resize-none mb-0"
                                    {...props}
                                />}
                            />

                            <div className="flex gap-2 mt-1">
                                <Button type="submit" size="sm" disabled={fetcher.state !== 'idle'}>
                                    {fetcher.state !== 'idle' ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                    type="reset"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        form.reset();
                                        setIsEditing(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Form>

                </div>) : <div>

                    { message.score && scoreConfig && <div>
                        {scoreConfig.displayComponent && <scoreConfig.displayComponent value={message.score.value} />}
                    </div>}

                    {/* {messageScoreConfigs.length > 0 && <div className="">
                        <PropertyList className="mb-2">
                            {messageScoreConfigs.map((scoreConfig) => {
                                const DisplayComponent = scoreConfig.displayComponent;
                                return (
                                    <PropertyListItem key={scoreConfig.name}>
                                        <PropertyListTitle>{scoreConfig.title ?? scoreConfig.name}</PropertyListTitle>
                                        <PropertyListTextValue>
                                            {DisplayComponent && <DisplayComponent value={scores[scoreConfig.name]} />}
                                        </PropertyListTextValue>
                                    </PropertyListItem>
                                );
                            })}
                        </PropertyList>
                    </div>} */}

                    {message.content && <div className={`${compressionLevel === "high" ? "line-clamp-6" : compressionLevel === "medium" ? "line-clamp-3" : ""}`}>
                        {textToElements(message.content, members.map((member) => ({
                            id: member.id,
                            label: member.name ?? "Unknown"
                        })))}
                    </div>}
                </div>}
            </div>
        </div>
    );
}
