import { useLoaderData, useFetcher, Outlet, Link, Form, data, useParams, useSearchParams, useNavigate, useRevalidator } from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import { Button } from "~/components/ui/button";
import { Header, HeaderTitle } from "~/components/header";
import { useEffect, useState } from "react";
import { parseSSE } from "~/lib/parseSSE";
import { apiFetch } from "~/lib/apiFetch";
import { getAPIBaseUrl } from "~/lib/getAPIBaseUrl";
import { getLastRun, getAllSessionItems, getVersions, getActiveRuns } from "~/lib/shared/sessionUtils";
import { type Run, type Session, type SessionItem } from "~/lib/shared/apiTypes";
import { getListParams, toQueryParams } from "~/lib/listParams";
import { PropertyList, PropertyListItem, PropertyListTextValue, PropertyListTitle } from "~/components/PropertyList";
import { AlertCircleIcon, ChevronDown, CircleDollarSign, CircleDollarSignIcon, CircleGauge, EllipsisVerticalIcon, FilePenLineIcon, InfoIcon, MessageCircleIcon, MessageCirclePlus, MessageSquareTextIcon, PencilIcon, PencilLineIcon, PenTool, PlayCircleIcon, ReceiptIcon, ReceiptText, SendHorizonalIcon, SettingsIcon, Share, SquareIcon, TagsIcon, ThumbsDown, ThumbsUp, TimerIcon, UserIcon, UsersIcon, WorkflowIcon, WrenchIcon } from "lucide-react";
import { useFetcherSuccess } from "~/hooks/useFetcherSuccess";
import { useSessionContext } from "~/lib/SessionContext";
import type { SessionItemConfig, AgentConfig } from "~/types";
import { AVFormError, BooleanToggleGroupControl, AVFormField } from "~/components/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ItemsWithCommentsLayout } from "~/components/ItemsWithCommentsLayout";
import { CommentSessionFloatingBox, CommentThread } from "~/components/comments";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "~/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { config } from "~/config";
import { findItemConfig, requireAgentConfig, requireItemConfig } from "~/lib/config";
import { Loader } from "~/components/Loader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { BaseError } from "~/lib/errors";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { DisplayProperties } from "~/components/DisplayProperties";
import { cn } from "~/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Form as HookForm } from "~/components/ui/form";

async function loader({ request, params }: LoaderFunctionArgs) {
    const response = await apiFetch<Session>(`/api/sessions/${params.id}`);

    if (!response.ok) {
        throw data(response.error, { status: response.status })
    }

    return {
        session: response.data,
        listParams: getListParams(request)
    };
}


function SessionPage() {
    const loaderData = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const { user } = useSessionContext();
    const listParams = loaderData.listParams;

    const [session, setSession] = useState(loaderData.session)
    const [isStreaming, setStreaming] = useState(false)

    const [searchParams, setSearchParams] = useSearchParams();
    const activeItems = getAllSessionItems(session, { activeOnly: true })
    const lastRun = getLastRun(session)

    const agentConfig = requireAgentConfig(config, session.agent);

    const selectedItemId = activeItems.find((a: any) => a.id === searchParams.get('itemId'))?.id ?? undefined;

    const setselectedItemId = (id: string | undefined) => {
        if (id === selectedItemId) {
            return // prevents unnecessary revalidation of the page
        }

        setSearchParams((searchParams) => {
            const currentItemId = searchParams.get('itemId') ?? undefined;

            if (currentItemId === id) {
                return searchParams;
            }

            if (id) {
                searchParams.set("itemId", id);
            } else {
                searchParams.delete("itemId");
            }
            return searchParams;
        }, { replace: true });
    }

    useEffect(() => {
        apiFetch(`/api/sessions/${session.id}/seen`, {
            method: 'POST',
        }).then((data) => {
            if (data.ok) {
                revalidator.revalidate();
            }
            else {
                console.error(data.error)
            }
        })
    }, [])

    // temporary 
    useEffect(() => {
        if (!isStreaming) {
            setSession(loaderData.session)
        }
    }, [loaderData.session])

    useEffect(() => {
        if (lastRun?.state === 'in_progress') {

            (async () => {
                try {
                    const response = await fetch(`${getAPIBaseUrl()}/api/sessions/${session.id}/watch_run`, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include', // ensure cookies are sent
                    });

                    setStreaming(true)

                    for await (const event of parseSSE(response)) {

                        setSession((currentSession) => {
                            const lastRun = getLastRun(currentSession);
                            if (!lastRun) { throw new Error("Unreachable: Last run not found") };

                            let newRun: typeof lastRun;

                            if (event.event === 'item') {
                                const newItem = event.data;
                                const newItemIndex = lastRun.sessionItems.findIndex((a: any) => a.id === newItem.id);

                                newRun = {
                                    ...lastRun,
                                    sessionItems: newItemIndex === -1 ?
                                        [...lastRun.sessionItems, newItem] : [
                                            ...lastRun.sessionItems.slice(0, newItemIndex),
                                            newItem
                                        ]
                                }
                            }
                            else if (event.event === 'state') {
                                newRun = {
                                    ...lastRun,
                                    ...event.data
                                }
                            }
                            else {
                                throw new Error(`Unknown event type: ${event.event}`)
                            }

                            return {
                                ...currentSession,
                                runs: currentSession.runs.map((run: any) =>
                                    run.id === lastRun.id ? newRun : run
                                )
                            }

                        })

                    }

                } catch (error) {
                    console.error(error)
                } finally {
                    setStreaming(false)
                }
            })()
        }

    }, [lastRun?.state])

    return <>
        {/* <div className="basis-[720px] flex-shrink-0 flex-grow-0 border-r  flex flex-col"> */}
        <div className="flex-shrink-0 flex-grow-1 border-r  flex flex-col">
            <Header>
                <HeaderTitle title={`Session ${session.handle}`} />
                <ShareForm session={session} />
            </Header>
            <div className="flex-1 overflow-y-auto">

                <div className="p-6 border-b">
                    <SessionDetails session={session} agentConfig={agentConfig} />
                </div>

                <div>

                    <ItemsWithCommentsLayout items={getActiveRuns(session).map((run) => {
                        return run.sessionItems.map((item, index) => {

                            const isLastRunItem = index === run.sessionItems.length - 1;

                            const hasComments = item.commentMessages.filter((m: any) => !m.deletedAt).length > 0

                            let content: React.ReactNode = null;

                            const itemConfig = findItemConfig(agentConfig, item.type, item.role);
                            if (!itemConfig?.displayComponent) {
                                content = <div className="text-muted-foreground italic">No component (type: "{item.type}"{item.role ? `, role: "${item.role}"` : ""})</div>
                            }
                            else {
                                content = <itemConfig.displayComponent value={item.content} />
                            }

                            return {
                                id: item.id,
                                itemComponent: <div
                                    className={`relative group`}
                                >
                                    <div className="absolute pl-2 left-[720px] text-muted-foreground text-xs font-medium flex flex-row gap-1">
                                        {!hasComments && <Button className="group-hover:visible invisible" variant="outline" size="icon_xs" onClick={() => { setselectedItemId(item.id) }}><MessageCirclePlus className="size-3" /></Button>}
                                    </div>
                                    <div className="relative max-w-[720px] pl-6">

                                        {content}

                                        {run.state === "in_progress" && <div className="text-muted-foreground mt-5">
                                            <Loader />
                                        </div>}

                                        {/* {run.state === "failed" && <div className="text-xs flex justify-start my-3 gap-1">
                                            <Alert variant="destructive">
                                                <AlertCircleIcon />
                                                {run.failReason?.message ?? "Unknown reason"}
                                            </Alert>
                                        </div>} */}

                                        {run.state === "failed" && <div className="border rounded-md flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 text-sm my-2">
                                            <AlertCircleIcon className="w-4 h-4 text-red-500" />
                                            <span>{run.failReason?.message ?? "Unknown reason"}</span>
                                        </div>}

                                        {run.state !== "in_progress" && isLastRunItem && <MessageFooter session={session} run={run} listParams={listParams} />}
                                    </div>
                                    {/* { !hasComments && <div className="absolute top-[8px] right-[408px] opacity-0 group-hover:opacity-100">
                                        <Button variant="outline" size="icon_xs" onClick={() => { setselectedItemId(item.id) }}><MessageSquareTextIcon /></Button>
                                    </div>} */}
                                </div>,
                                // itemComponent: <div 
                                //     className={`relative pl-6 py-2 pr-[444px] group ${params.itemId === item.id ? "bg-gray-50" : "hover:bg-gray-50"}`} 
                                //     onClick={() => { navigate(`/sessions/${session.id}/items/${item?.id}?${toQueryParams(listParams)}`) }}>

                                //     {content}
                                //     {/* { !hasComments && <div className="absolute top-[8px] right-[408px] opacity-0 group-hover:opacity-100">
                                //         <Button variant="outline" size="icon_xs" onClick={() => { setselectedItemId(item.id) }}><MessageSquareTextIcon /></Button>
                                //     </div>} */}
                                // </div>,
                                commentsComponent: (hasComments || (selectedItemId === item.id)) ?
                                    <div className="relative pr-4"><CommentSessionFloatingBox
                                        item={item}
                                        session={session}
                                        selected={selectedItemId === item.id}
                                        onSelect={(a) => { setselectedItemId(a?.id) }}
                                    /></div> : undefined
                            }
                        })
                    }).flat()} selectedItemId={selectedItemId}
                    />

                </div>

            </div>


            {session.client.simulatedBy === user.id && <InputForm session={session} agentConfig={agentConfig} />}

        </div>

        <Outlet context={{ session }} />
    </>
}



function SessionDetails({ session, agentConfig }: { session: Session, agentConfig: AgentConfig }) {
    const versions = getVersions(session);
    const { members } = useSessionContext();

    const simulatedBy = members.find((member) => member.id === session.client.simulatedBy);

    return (
        <div className="w-full">

            {/* <div className="text-foreground">Lorem ipsum</div>
            <div className="text-gray-400">Lorem ipsum</div>
            <div className="text-muted-foreground">Lorem ipsum</div>
            <div className="text-gray-600">Lorem ipsum</div> */}

            {/* <div className="text-foreground-subtle">Lorem ipsum</div> */}

            <PropertyList>
                <PropertyListItem>
                    <PropertyListTitle>Agent</PropertyListTitle>
                    <PropertyListTextValue>{session.agent}</PropertyListTextValue>
                </PropertyListItem>
                <PropertyListItem>
                    <PropertyListTitle>Created</PropertyListTitle>
                    <PropertyListTextValue>
                        {new Date(session.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </PropertyListTextValue>
                </PropertyListItem>
                <PropertyListItem>
                    <PropertyListTitle>Source</PropertyListTitle>
                    <PropertyListTextValue>
                        {simulatedBy ? <>Simulated by <span className="text-cyan-700">{simulatedBy.name}</span></> : "Real"}
                    </PropertyListTextValue>
                </PropertyListItem>
                <PropertyListItem>
                    <PropertyListTitle>
                        {versions.length > 1 ? "Versions" : "Version"}
                    </PropertyListTitle>
                    <PropertyListTextValue>
                        {versions.length > 0 ? versions.map(version => (version?.version ?? "") + "." + (version?.env ?? "")).join(", ") : "-"}
                    </PropertyListTextValue>
                </PropertyListItem>

                {agentConfig.displayProperties && <DisplayProperties displayProperties={agentConfig.displayProperties} inputArgs={{ session }} />}
            </PropertyList>
        </div>
    );
}

function ShareForm({ session }: { session: Session }) {
    const fetcher = useFetcher();
    if (session.client.isShared) {
        return <div className="flex flex-row gap-1 items-center text-xs text-white bg-cyan-700 px-2 py-1 rounded-md font-medium"><UsersIcon className="size-3" />Shared</div>
        // return <Badge>Public</Badge>
    }

    return <fetcher.Form method="put" action={`/clients/${session.client.id}/share`}>
        <input type="hidden" name="isShared" value="true" />
        <Button variant="outline" size="sm" type="submit"><Share /> {fetcher.state === "submitting" ? "Making public..." : "Make public"}</Button>
    </fetcher.Form>
}

function Component() {
    const loaderData = useLoaderData<typeof loader>();
    return <SessionPage key={loaderData.session.id} />
}

function InputForm({ session, agentConfig }: { session: Session, agentConfig: AgentConfig }) {
    const [error, setError] = useState<BaseError | undefined>(undefined)

    const lastRun = getLastRun(session)
    const revalidator = useRevalidator()

    const submit = async (values: any, inputItemConfig: SessionItemConfig) => {
        try {
            const response = await apiFetch(`/api/sessions/${session.id}/runs`, {
                method: 'POST',
                body: {
                    input: {
                        type: inputItemConfig.type,
                        role: inputItemConfig.role,
                        content: values
                    }
                }
            });

            if (!response.ok) {
                setError(response.error)
            }
            else {
                revalidator.revalidate();
            }

        } catch (error) {
            setError(error instanceof Error ? { message: error.message } : { message: 'Unknown error' })
        }
    }

    const cancel = async () => {
        await apiFetch(`/api/sessions/${session.id}/cancel_run`, {
            method: 'POST',
        })
    }

    const runConfigs = agentConfig.runs ?? [];

    const FirstInputComponent = runConfigs[0]?.input.inputComponent;

    return <div className="border-t">
        <div className="p-6 pr-0 max-w-[720px]">
            {runConfigs.length === 0 && <div className="text-sm text-muted-foreground">No runs</div>}

            {runConfigs.length === 1 ? (
                // Single input config - no tabs
                <div>
                    {FirstInputComponent && <div>
                        {error && <AVFormError error={error} className="mb-4" />}

                        <FirstInputComponent
                            cancel={cancel}
                            submit={(values) => { submit(values, runConfigs[0].input) }}
                            schema={runConfigs[0].input.content}
                            error={error}
                            isRunning={lastRun?.state === 'in_progress'}
                        /></div>}
                </div>
            ) : (
                // Multiple input configs - use tabs
                <Tabs defaultValue={`${runConfigs[0].input.type}-${runConfigs[0].input.role || 'default'}`} className="gap-3" onValueChange={() => {
                    setError(undefined)
                }}>
                    <TabsList>
                        {runConfigs.map((runConfig, index) => {
                            const inputConfig = runConfig.input;

                            const tabName = runConfig.title || (inputConfig.role
                                ? `${inputConfig.type} / ${inputConfig.role}`
                                : inputConfig.type)
                            const tabValue = `${inputConfig.type}-${inputConfig.role || 'default'}`;

                            return (
                                <TabsTrigger key={index} value={tabValue}>
                                    {tabName}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {runConfigs.map((runConfig, index) => {
                        const inputConfig = runConfig.input;
                        const tabValue = `${inputConfig.type}-${inputConfig.role || 'default'}`;

                        const InputComponent = runConfig.input.inputComponent;

                        return (
                            <TabsContent key={index} value={tabValue}>
                                {error && <AVFormError error={error} className="mb-4" />}

                                {InputComponent && <InputComponent
                                    cancel={cancel}
                                    submit={(values) => { submit(values, inputConfig) }}
                                    schema={inputConfig.content}
                                    error={error}
                                    isRunning={lastRun?.state === 'in_progress'}
                                />}

                                {!InputComponent && <div className="text-muted-foreground">No input component for session item: <code className="text-sm">{"{"} type: "{inputConfig.type}"{inputConfig.role ? `, role: "${inputConfig.role}"` : ""} {"}"}</code></div>}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            )}

            {/* <Textarea name="message" placeholder="Reply here..." rows={1} className="mb-2" /> */}
            {/* 
                <div className="flex flex-row gap-2 items-center mt-2">

                    {lastRun?.state !== 'in_progress' && <Button type="submit">Send <SendHorizonalIcon /></Button>}
                    {lastRun?.state === 'in_progress' && <Button type="button" onClick={() => {
                        handleCancel()
                    }}>Cancel <SquareIcon /></Button>}

                    <div className="gap-2 text-sm text-muted-foreground">
                        {formError && <div className="text-red-500">{formError}</div>}
                    </div>

                </div>
            </form> */}

        </div>
    </div>
}

export const sessionRoute: RouteObject = {
    Component,
    loader,
}


function NotionPill({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-row gap-1 items-center h-[20px] rounded-xs bg-gray-100 px-1 text-xs [&>*]:size-3 text-gray-700">
        {children}
    </div>
}

function NotionPillMedium({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("flex flex-row gap-1 items-center h-[28px] rounded-md bg-gray-100 px-2 text-sm [&>*]:size-4 text-gray-700", className)}>
        {children}
    </div>
}

function NotionPillMediumBold({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("flex flex-row gap-1 items-center h-[28px] rounded-md bg-gray-100 px-2 text-sm [&>*]:size-4 text-gray-600 font-medium ", className)}>
        {children}
    </div>
}

function LargePillOutline({ children }: { children: React.ReactNode }) {
    return <div className=" h-[27px] bg-gray-100 px-2 rounded-md text-sm flex items-center justify-center flex-row gap-1 [&>*]:size-4 text-gray-700">
        {children}
    </div>
}


function AlertBox({ children }: { children: React.ReactNode }) {
    return <div className=" rounded-md flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm">
        <AlertCircleIcon className="size-4 text-yellow-500" />
        {children}
    </div>
}

function LikeWidget() {
    return <div className="flex flex-row border rounded-md px-1.5 h-[28px] items-center">
        <ThumbsUp className="size-4" />
        <div className="border-l h-full mx-1.5" />
        <ThumbsDown className="size-4" />
    </div>
}

// function MultiSelectWidget() {
//     return <div className="flex flex-col border rounded-md h-[40px] items-center gap-1 px-1.5">
//         <div className="text-sm font-medium">Tags</div>
//         <div className="flex flex-row gap-1">
//             <NotionPill>Tag 1</NotionPill>
//             <NotionPill>Tag 2</NotionPill>
//             <NotionPill>Tag 3</NotionPill>
//         </div>
//     </div>
// }

function MultiSelectWidget() {
    return <div className="flex flex-row border rounded-md h-[28px] items-center gap-1 px-1.5">
        <div className="text-sm font-medium flex flex-row gap-1 items-center"><TagsIcon className="size-4" /> Tags</div>
        <div className="text-muted-foreground">· 3 choices</div>
        {/* <div className="flex flex-row gap-1">
            <NotionPill>First Tag</NotionPill>
            <NotionPill>Inconsequential</NotionPill>
            <NotionPill>Tag 3</NotionPill>
        </div> */}
    </div>
}

function getAllScoreConfigs(session: Session, item: SessionItem) {
    const agentConfig = requireAgentConfig(config, session.agent);
    const itemConfig = requireItemConfig(agentConfig, item.type, item.role);
    return itemConfig?.scores || [];
}

function ScoreDialog({ session, item, open, onOpenChange }: { session: Session, item: SessionItem, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useSessionContext();
    const fetcher = useFetcher();

    const allScoreConfigs = getAllScoreConfigs(session, item);

    const schema = z.object(
        Object.fromEntries(
            allScoreConfigs.map((scoreConfig) => [
                scoreConfig.name,
                scoreConfig.schema.optional()
            ])
        )
    )

    const defaultValues : Record<string, any> = {};
    for (const score of item.scores ?? []) {
        if (score.deletedAt || score.createdBy !== user.id) {
            continue;
        }
        defaultValues[score.name] = score.value;
    }

    const form = useForm({
        resolver: zodResolver<any, any, any>(schema),
        defaultValues
    });

    const submit = (data: z.infer<typeof schema>) => {
        const payload = Object.entries(data).map(([name, value]) => ({ name, value }));

        // @ts-ignore i don't know why but payload as array is not correct body but it's correct JSON.
        fetcher.submit(payload, { 
            method: 'put', 
            action: `/sessions/${session.id}/items/${item.id}/scores`, 
            encType: 'application/json' 
        });
    }

    useFetcherSuccess(fetcher, () => {
        onOpenChange(false);
    });

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="xs"><CircleGauge />Score</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-3">
                <div>
                    <div className="font-medium text-sm mb-4">Scores</div>

                    {fetcher.state === 'idle' && fetcher.data?.ok === false && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircleIcon className="h-4 w-4" />
                            <AlertDescription>{fetcher.data.error.message}</AlertDescription>
                        </Alert>
                    )}

                    <HookForm {...form}>
                        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
                            <div className="space-y-3">
                                {allScoreConfigs.map((scoreConfig) => (
                                    <AVFormField
                                        variant="row"
                                        key={scoreConfig.name}
                                        label={scoreConfig.title ?? scoreConfig.name}
                                        name={scoreConfig.name}
                                        control={scoreConfig.inputComponent}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2 justify-end mt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={fetcher.state !== 'idle'}
                                >
                                    {fetcher.state !== 'idle' ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </form>
                    </HookForm>

                </div>
            </PopoverContent>
        </Popover>
    );
}

function MessageFooter({ session, run, listParams }: { session: Session, run: Run, listParams: ReturnType<typeof getListParams> }) {
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
    const lastItem = run.sessionItems[run.sessionItems.length - 1];

    return <div className="mt-3  mb-8 ">

        {/* <div className="flex flex-col gap-2 text-sm flex-wrap items-start">
            <div className="flex flex-row gap-1 items-center text-sm">
                <NotionPill><TimerIcon /> 4s</NotionPill>
                <NotionPill>$1.25</NotionPill>
                <NotionPill>Neutral</NotionPill>
            </div>
            <AlertBox>This is a textual alert about something important.</AlertBox>
        </div>

        <div className="border-t mt-3 mb-2" /> */}
        <div>
            <div className="text-xs flex justify-between gap-2 items-start">
                <div className="flex flex-row flex-wrap gap-1.5 items-center">
                    <LikeWidget />
                    <Button variant="outline" size="xs"><MessageCirclePlus />Comment</Button>

                    {/* <Button variant="outline" size="xs"><ThumbsUp />Like</Button>
                    <Button variant="outline" size="xs"><ThumbsDown />One, Two, Three and 3 others...</Button>
                    <Button variant="outline" size="xs"><CircleGauge />Score</Button>
                    <Button variant="outline" size="xs"><FilePenLineIcon />Edit</Button>
                    <Button variant="outline" size="xs"><WorkflowIcon />Dog, Cattle, Hipopotamus and 2 others...</Button>
                    <Button variant="outline" size="xs"><ChevronDown />More</Button>
                    <Button variant="outline" size="xs"><AlertCircleIcon />Alert</Button>
                    <Button variant="outline" size="xs"><TimerIcon />Time</Button>
                    <Button variant="outline" size="xs"><MessageCirclePlus />Comment</Button>
                    <Button variant="outline" size="xs"><MessageSquareTextIcon />Note</Button>
                    <Button variant="outline" size="xs"><WrenchIcon />Tools</Button>
                    <Button variant="outline" size="xs"><CircleGauge />Metrics</Button> */}
                    <ScoreDialog 
                        session={session} 
                        item={lastItem} 
                        open={scoreDialogOpen} 
                        onOpenChange={setScoreDialogOpen}
                    />
                    {/* <MultiSelectWidget /> */}
                </div>

                <div className="flex flex-row  items-center text-sm">
                    {/* <Button variant="ghost" size="icon_xs" className="text-muted-foreground"><FilePenLineIcon /></Button> */}
                    <Button variant="ghost" size="xs" className="text-muted-foreground" asChild>
                        <Link to={`/sessions/${session.id}/runs/${run.id}?${toQueryParams(listParams)}`}><WrenchIcon className="size-4" />Run</Link>
                    </Button>
                </div>
            </div>
        </div>

        {/* <div className="border mt-3 mb-2 rounded-md">
            <CommentThread
                session={session}
                item={run.sessionItems[run.sessionItems.length - 1]}
                collapsed={true}
                small={true}
                singleLineMessageHeader={true}
            />
        </div> */}

        {/* <Button asChild variant="outline" size="xs">
        <Link to={`/sessions/${session.id}/runs/${run.id}?${toQueryParams(listParams)}`}>Run <WrenchIcon className="size-4" /></Link>
    </Button> */}
    </div>
}