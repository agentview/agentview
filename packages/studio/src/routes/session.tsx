import { useLoaderData, useFetcher, Outlet, Link, Form, data, useParams, useSearchParams, useNavigate, useRevalidator } from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import { Button } from "../components/ui/button";
import { Header, HeaderTitle } from "../components/header";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseSSE } from "../lib/parseSSE";
import { apiFetch } from "../lib/apiFetch";
import { getLastRun, getAllSessionItems, getVersions, getActiveRuns, enhanceSession } from "agentview/sessionUtils";
import { type Run, type RunWithCollaboration, type Session, type SessionItem, type SessionItemWithCollaboration, type SessionWithCollaboration } from "agentview/apiTypes";
import { getListParams, toQueryParams } from "../lib/listParams";
import { PropertyList, PropertyListItem, PropertyListTextValue, PropertyListTitle } from "../components/PropertyList";
import { AlertCircleIcon, BugIcon, CheckIcon, ChevronDown, ChevronsDownUp, CircleCheck, CircleDollarSign, CircleDollarSignIcon, CircleGauge, EllipsisVerticalIcon, ExternalLinkIcon, FilePenLineIcon, InfoIcon, MessageCircleIcon, MessageCirclePlus, MessageCirclePlusIcon, MessageSquareTextIcon, PencilIcon, PencilLineIcon, PenTool, PlayCircleIcon, ReceiptIcon, ReceiptText, SendHorizonalIcon, SettingsIcon, Share, SquareIcon, SquareTerminal, TagsIcon, TerminalIcon, ThumbsDown, ThumbsDownIcon, ThumbsUp, ThumbsUpIcon, TimerIcon, UserIcon, UsersIcon, WorkflowIcon, WrenchIcon } from "lucide-react";
import { useFetcherSuccess } from "../hooks/useFetcherSuccess";
import { useSessionContext } from "../lib/SessionContext";
import type { SessionItemConfig, AgentConfig, ScoreConfig, SessionItemDisplayComponentProps } from "agentview/types";
import { AVFormField } from "../components/internal/form";
import { ItemsWithCommentsLayout } from "../components/internal/ItemsWithCommentsLayout";
import { CommentsThread } from "../components/internal/comments";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { config } from "../config";
import { findItemConfigById, findMatchingRunConfigs, requireAgentConfig } from "agentview/configUtils";
import { Loader } from "../components/internal/Loader";
import { Alert, AlertDescription } from "../components/ui/alert";
import type { BaseError } from "../lib/errors";
import { DisplayProperties } from "../components/DisplayProperties";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form as HookForm } from "../components/ui/form";
import { Pill } from "../components/Pill";
import { useRerender } from "../hooks/useRerender";
import { ItemCard, ItemCardContent, ItemCardTitle, ItemCardJSON, ItemCardMarkdown, UserMessage, AssistantMessage, StepItem } from "../components/session-item";
import { debugRun } from "../lib/debugRun";
import { ErrorBoundary } from "../components/internal/ErrorBoundary";
import { toast } from "sonner";
import { like } from "../scores";

async function loader({ request, params }: LoaderFunctionArgs) {
    const response = await apiFetch<SessionWithCollaboration>(`/api/sessions/${params.id}`);

    if (!response.ok) {
        throw data(response.error, { status: response.status })
    }

    return {
        session: response.data,
        listParams: getListParams(request)
    };
}

function Component() {
    const loaderData = useLoaderData<typeof loader>();
    return <SessionPage key={loaderData.session.id} />
}

function DefaultInputComponent({ item }: SessionItemDisplayComponentProps) {
    return <UserMessage>{item}</UserMessage>
}

function DefaultAssistantComponent({ item }: SessionItemDisplayComponentProps) {
    return <AssistantMessage>{item}</AssistantMessage>
}

function DefaultStepComponent({ item }: SessionItemDisplayComponentProps) {
    return <StepItem>{item}</StepItem>
}

function DefaultToolComponent({ item, resultItem }: SessionItemDisplayComponentProps) {
    const result = {
        call: item,
        result: resultItem
    }

    // @ts-ignore
    return <StepItem>{result}</StepItem>
}

function SessionPage() {
    const loaderData = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const { me } = useSessionContext();

    const [session, setSession] = useState<SessionWithCollaboration>(loaderData.session)

    useEffect(() => {
        setSession(loaderData.session);
    }, [loaderData.session]);

    // Session with applied local watched run
    // const session = {
    //     ...loaderData.session,
    //     runs: loaderData.session.runs.map(run => {
    //         if (run.id === watchedRun?.id) {
    //             return watchedRun
    //         }
    //         return run;
    //     })
    // } as SessionWithCollaboration

    const listParams = loaderData.listParams;
    const activeItems = getAllSessionItems(session, { activeOnly: true })
    const lastRun = getLastRun(session)

    const agentConfig = requireAgentConfig(config, session.agent);

    const searchParams = new URLSearchParams(window.location.search);
    const selectedItemId = activeItems.find((a: any) => a.id === searchParams.get('itemId'))?.id ?? undefined;

    const setselectedItemId = (id: string | undefined) => {
        /**
         * We're not using setSearchParams here from useSearchParams.
         * It's because:
         * - we must not touch the route if new id is the same as current one, it's bad for performance
         * - searchParams from the hook is not up-to-date when setSelectedItemId runs (closure)
         * - setSearchParams does take fresh searchParams as an argument, but it always runs `navigate`, you can't prevent that.
         * - the code in this function is almost like setSearchParams from RR7 (I checked the source code), we're not losing anything
         */
        const currentSearchParams = new URLSearchParams(window.location.search);
        const currentItemId = currentSearchParams.get('itemId') ?? undefined;

        if (currentItemId === id) {
            return;
        }

        if (id) {
            currentSearchParams.set("itemId", id);
        }
        else {
            currentSearchParams.delete("itemId");
        }

        navigate(`?${currentSearchParams.toString()}`, { replace: true });

    }

    useEffect(() => {

        const abortController = new AbortController();

        (async () => {

            try {
                const url = new URL(`/api/sessions/${session.id}/watch`, config.apiBaseUrl).toString();

                const response = await fetch(url, {
                    credentials: 'include', // ensure cookies are sent
                    signal: abortController.signal,
                });

                for await (const event of parseSSE(response)) {
                    setSession((prevSession) => {
                        if (event.event === 'session.snapshot') {
                            return event.data;
                        }
                        else if (event.event === 'run.created') {
                            // if run already exists, don't add it again
                            if (prevSession.runs.find(run => run.id === event.data.id)) {
                                return prevSession;
                            }

                            return {
                                ...prevSession,
                                runs: [...prevSession.runs, event.data]
                            }
                        }
                        else if (event.event === 'run.archived') {
                            return {
                                ...prevSession,
                                runs: prevSession.runs.filter(run => run.id !== event.data.id)
                            }
                        }
                        else if (event.event === 'run.updated') {
                            return {
                                ...prevSession,
                                runs: prevSession.runs.map(run => {
                                    if (run.id === event.data.id) {
                                        return { ...run, ...event.data, sessionItems: [...run.sessionItems, ...event.data.sessionItems ?? []] }
                                    }
                                    return run;
                                })
                            }
                        }
                        else {
                            console.warn('Unknown event type', event.event)
                            return prevSession
                        }
                    })
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    console.log('stream aborted');
                    return;
                }

                throw err;
            }
        })()

        return () => {
            abortController.abort();
        }

    }, [])

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

    const bodyRef = useRef<HTMLDivElement>(null);

    const PADDING = 24;
    const COMMENTS_WIDTH = 310;
    const COMMENT_BUTTON_WIDTH = 28;
    const COMMENT_BUTTON_PADDING = 8;
    const TEXT_MAX_WIDTH = 720;

    let styles: Record<string, any> = {}

    if (!bodyRef.current) { // just first render for the purpose of the layout. useLayoutEffect makes sure that the component will be rerendered before paint with bodyRef.current set.
        styles = {
            padding: PADDING,
            commentsWidth: COMMENTS_WIDTH,
            commentButtonWidth: COMMENT_BUTTON_WIDTH,
            commentButtonPadding: COMMENT_BUTTON_PADDING,
            textWidth: TEXT_MAX_WIDTH,
            isSmallSize: false
        }
    }
    else {
        const isSmallSize = !window.matchMedia("(min-width: 1440px)").matches

        const textWidth = isSmallSize ?
            Math.min(bodyRef.current.offsetWidth - PADDING * 2, TEXT_MAX_WIDTH) :
            Math.min(bodyRef.current.offsetWidth - PADDING * 2 - COMMENT_BUTTON_WIDTH - COMMENT_BUTTON_PADDING * 2 - COMMENTS_WIDTH, TEXT_MAX_WIDTH)

        styles = {
            padding: PADDING,
            commentsWidth: COMMENTS_WIDTH,
            commentButtonWidth: COMMENT_BUTTON_WIDTH,
            commentButtonPadding: COMMENT_BUTTON_PADDING,
            textWidth,
            isSmallSize
        };
    }

    const rerender = useRerender();

    useLayoutEffect(() => {
        rerender();
    }, [])

    useEffect(() => {
        function handleResize() {
            rerender();
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [])

    return <>
        <div className="flex-grow-1 border-r  flex flex-col">
            <Header className="py-1">
                <HeaderTitle title={`Session ${session.handle}`} />
                {session.user.createdBy === me.id && <ShareForm session={session} />}
            </Header>
            <div className="flex-1 overflow-y-auto">

                <div className="p-6 border-b">
                    <SessionDetails session={session} agentConfig={agentConfig} />
                </div>

                <div ref={bodyRef}>
                    <ItemsWithCommentsLayout items={getActiveRuns(session).map((run) => {
                        return run.sessionItems.map((item, index) => {
                            const isLastRunItem = index === run.sessionItems.length - 1;
                            const isInputItem = index === 0;

                            const hasComments = item.commentMessages.filter((m: any) => !m.deletedAt).length > 0
                            const isSelected = selectedItemId === item.id;

                            let content: React.ReactNode = null;

                            const runConfigMatches = findMatchingRunConfigs(agentConfig, run.sessionItems[0].content);
                            const itemConfigMatch = runConfigMatches.length === 1 ? findItemConfigById(runConfigMatches[0], run.sessionItems, item.id) : undefined;

                            if (itemConfigMatch?.itemConfig?.displayComponent === null) {
                                return null;
                            }

                            if (isInputItem) {
                                const Component = itemConfigMatch?.itemConfig?.displayComponent ?? DefaultInputComponent;
                                if (!Component) {
                                    return null;
                                }
                                content = <div className="pl-[10%] relative">
                                    <Component item={item.content} sessionItem={item} run={run} session={session} />
                                </div>
                            }
                            else if (itemConfigMatch?.type === "output") {
                                const Component = itemConfigMatch?.itemConfig?.displayComponent ?? DefaultAssistantComponent;
                                content = <Component item={item.content} sessionItem={item} run={run} session={session} />
                            }
                            else {
                                if (itemConfigMatch?.tool) {
                                    let callContent: any = undefined;
                                    let resultContent: any = undefined;
                                    let Component: React.ComponentType<SessionItemDisplayComponentProps>;

                                    if (itemConfigMatch?.tool.type === "call") {
                                        if (itemConfigMatch?.tool?.hasResult) {
                                            return null;
                                        }
                                        else {
                                            callContent = itemConfigMatch.content;
                                            Component = itemConfigMatch?.itemConfig?.displayComponent ?? DefaultToolComponent;
                                        }
                                    }
                                    else if (itemConfigMatch?.tool.type === "result") {
                                        resultContent = itemConfigMatch.content;
                                        callContent = itemConfigMatch.tool.call.content;
                                        Component = itemConfigMatch?.tool.call.itemConfig?.displayComponent ?? DefaultToolComponent;
                                    }
                                    else {
                                        throw new Error(`Unreachable`);
                                    }

                                    // const Component = itemConfigMatch?.itemConfig?.displayComponent ?? DefaultToolComponent;
                                    content = <Component item={callContent} resultItem={resultContent} sessionItem={item} run={run} session={session} />
                                }
                                else {
                                    const Component = itemConfigMatch?.itemConfig?.displayComponent ?? DefaultStepComponent;
                                    content = <Component item={item.content} sessionItem={item} run={run} session={session} />    
                                }

                            }

                            return {
                                id: item.id,
                                itemComponent: <div
                                    className={`relative group`}
                                >
                                    {!styles.isSmallSize && <div className={`absolute text-muted-foreground text-xs font-medium flex flex-row gap-1 z-10`} style={{ left: `${styles.padding + styles.textWidth + styles.commentButtonPadding}px` }}>
                                        {!isSelected && <Button className="group-hover:visible invisible" variant="outline" size="icon_xs" onClick={() => { setselectedItemId(item.id) }}>
                                            <MessageCirclePlus className="size-3" />
                                        </Button>}
                                    </div>}

                                    <div className={`relative`} style={{ marginLeft: `${styles.padding}px`, width: `${styles.textWidth}px` }}>

                                        <div data-item /*onClick={() => { setselectedItemId(item.id) }}*/ >
                                            <ErrorBoundary>
                                                {content}
                                            </ErrorBoundary>
                                        </div>

                                        <MessageFooter
                                            session={session}
                                            run={run}
                                            listParams={listParams}
                                            item={item}
                                            itemConfig={itemConfigMatch?.itemConfig}
                                            onSelect={() => { setselectedItemId(item.id) }}
                                            isSelected={isSelected}
                                            isSmallSize={styles.isSmallSize}
                                            isLastRunItem={isLastRunItem}
                                            isOutput={itemConfigMatch?.type === "output"}
                                        />

                                        {isLastRunItem && run.status === "in_progress" && <div className="text-muted-foreground mt-5">
                                            <Loader />
                                        </div>}


                                    </div>
                                </div>,
                                commentsComponent: !styles.isSmallSize && (hasComments || (isSelected)) ?
                                    <CommentsThread
                                        item={item}
                                        itemConfig={itemConfigMatch?.itemConfig}
                                        session={session}
                                        selected={isSelected}
                                        onSelect={(a) => { setselectedItemId(a?.id) }}
                                    /> : undefined
                            }
                        })
                    }).flat().filter((item) => item !== undefined && item !== null)} selectedItemId={selectedItemId}
                        commentsContainer={{
                            style: {
                                width: `${styles.commentsWidth}px`,
                                left: `${styles.padding + styles.textWidth + styles.commentButtonWidth + styles.commentButtonPadding * 2}px`
                            }
                        }}
                    />

                </div>

            </div>


            {session.user.createdBy === me.id && <InputForm session={session} agentConfig={agentConfig} styles={styles} />}

        </div>

        <Outlet context={{ session }} />
    </>
}


function SessionDetails({ session, agentConfig }: { session: Session, agentConfig: AgentConfig }) {
    const versions = getVersions(session);
    const { members } = useSessionContext();

    const simulatedBy = members.find((member) => member.id === session.user.createdBy);

    return (
        <div className="w-full">
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
                        {simulatedBy ? <>Simulated by <span className="text-cyan-700">{simulatedBy.name}</span></> : "Production"}
                    </PropertyListTextValue>
                </PropertyListItem>
                <PropertyListItem>
                    <PropertyListTitle>
                        {versions.length > 1 ? "Versions" : "Version"}
                    </PropertyListTitle>
                    <PropertyListTextValue>
                        {versions.length === 0 && <span className="text-muted-foreground">-</span>}
                        {versions.length > 0 && <div className="flex flex-row gap-1">{versions.map(version => {
                            const versionString = version?.version ?? "";
                            return <Pill key={versionString}>{versionString}</Pill>
                        })}</div>}
                    </PropertyListTextValue>
                </PropertyListItem>

                {agentConfig.displayProperties && <DisplayProperties displayProperties={agentConfig.displayProperties} inputArgs={{ session }} />}
            </PropertyList>
        </div>
    );
}

function ShareForm({ session }: { session: Session }) {
    return <div>FIX ME 14</div>
    // const fetcher = useFetcher();
    // return <fetcher.Form method="put" action={`/users/${session.user.id}/share`}>
    //     <input type="hidden" name="isShared" value={session.user.isShared ? "false" : "true"} />
    //     <Button variant={"outline"} size="sm" type="submit">
    //         <UsersIcon fill={session.user.isShared ? "black" : "none"} stroke={session.user.isShared ? "none" : "black"} /> {session.user.isShared ? "Shared" : "Share"}
    //     </Button>
    // </fetcher.Form>
}

// const inputComponent = ({ session, userToken }) => {
//     const abortController = useRef(null)

//     return <UserMessageInput
//         onSubmit={(value) => {
//             abortController.current = new AbortController();

//             fetch("https://localhost:3000/chat", {
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 method: 'POST',
//                 body: JSON.stringify({
//                     input: { content: value },
//                     sessionId: session.id
//                     userToken
//                 }),
//                 signal: abortController.current.signal
//             }).catch(() => {

//             }).finally(() => {
//                 abortController.current = null;
//             })
//         }} 
//         onCancel={() => {
//             abortController.abort();  
//         }}
//         isLoading={abortController.current || session.lastRun?.status === "in_progress"}
//     />
// }

function InputForm({ session, agentConfig, styles }: { session: Session, agentConfig: AgentConfig, styles: Record<string, number> }) {
    const [error, setError] = useState<BaseError | undefined>(undefined)

    const lastRun = getLastRun(session)

    const [abortController, setAbortController] = useState<AbortController | undefined>(undefined)

    const submit = async (url: string, options: RequestInit & { input?: any }) => {
        const abortController = new AbortController();
        setAbortController(abortController);
        setError(undefined);

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: options.input,
                id: session.id,
                token: session.user.token
            }),
            signal: abortController.signal,
            ...(options ?? {}),
        }

        return fetch(url, fetchOptions)
            .then(async (response) => {
                if (!response.ok) {
                    console.error(`The fetch to '${url}' (done via 'submit' function) returned error response (${response.status} ${response.statusText}). Check Network tab in browser for error details.`);
                    toast.error(`Error: "${response.status} ${response.statusText}". Check console.`);
                }
                return response;
            })
            .catch((error: any) => {
                if (error?.name === 'AbortError') {
                    console.log('stream aborted');
                    return;
                }

                console.error(`The fetch to '${url}' (done via 'submit' function) threw an error. Check Network tab in browser for error details.`);
                console.error(error);
                toast.error(`Error: "${error.message}". Check console.`);
                return;
            })
            .finally(() => {
                setAbortController(undefined);
            })
    }

    const cancel = async () => {
        if (lastRun?.status === 'in_progress') {
            console.log('all good, cancelling');
            await apiFetch(`/api/runs/${lastRun.id}`, {
                method: 'PATCH',
                body: {
                    status: 'cancelled'
                }
            });

            // must go *after* request above to prevent race
            abortController?.abort();
        }

        setAbortController(undefined);
    }

    // submit, cancel are *special* (shorthand). isRunning is legit when session is running. It's THAT SIMPLE. Trivial. Do not overthink it.

    const isRunning = lastRun?.status === 'in_progress' || !!abortController;

    const InputComponent = agentConfig.inputComponent;
    if (InputComponent === null) {
        return null;
    }

    useEffect(() => {
        if (error) {
            alert(JSON.stringify(error, null, 2));
        }
    }, [error]);

    return <div className="border-t">
        <div className={`p-6 pr-0`} style={{ maxWidth: `${styles.textWidth + styles.padding}px` }}>
            {!InputComponent && <div className="text-sm text-muted-foreground">No input component</div>}

            {InputComponent && (
                <div>
                    <InputComponent
                        cancel={cancel}
                        submit={submit}
                        isRunning={isRunning}
                        session={enhanceSession(session)}
                        token={session.user.token}
                    />
                </div>
            )}

        </div>
    </div>
}

export const sessionRoute: RouteObject = {
    Component,
    loader,
}

type MessageFooterProps = {
    session: SessionWithCollaboration,
    run: RunWithCollaboration,
    listParams: ReturnType<typeof getListParams>,
    item: SessionItemWithCollaboration,
    itemConfig?: SessionItemConfig,
    onSelect: () => void,
    isSelected: boolean,
    isSmallSize: boolean,
    isLastRunItem: boolean,
    isOutput: boolean,
}


/**
 * ACTION BAR DESIGN GUIDELINES:
 * - we must start with the "Pill", that must be quite minimalistic, otherwise everything is too heavy.
 * - the pill with "md" size looks good, it's almost like in Notion, just 2px higher and this allows font 14px to be set (the same as in the button)
 * - this in turn makes it look good with buttons from shadcn. Ghost, sm.
 * - clickable height 32px
 * - outline buttons should be avoided, but if you want to use them, use outline xs. Look fine.
 * 
 * Problem?
 * - pills in comments must be "xs", otherwise are too large. It'd be good to have 1 type of pill. But either we keep it Notion-like *or* look good with off-the-shelf shadcn.
 */


function MessageFooter(props: MessageFooterProps) {
    const { session, run, listParams, item, itemConfig, onSelect, isSelected, isSmallSize, isLastRunItem, isOutput } = props;
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false);

    const allScoreConfigs = itemConfig?.scores ?? [];

    const actionBarScores = allScoreConfigs.filter(scoreConfig => scoreConfig.actionBarComponent);
    const remainingScores = allScoreConfigs.filter(scoreConfig => !scoreConfig.actionBarComponent);

    // const hasLike = isOutput ? (itemConfig?.like ?? true) : (itemConfig?.like ?? false);
    // if (hasLike) {
    //     actionBarScores.unshift(like());
    // }

    if (actionBarScores.length === 0 && remainingScores.length === 0 && !isSmallSize && !isLastRunItem) {
        return null;
    }


    return <div className="mt-3 mb-8">
        {isLastRunItem && run.status === "failed" && <div className="text-md mt-6 mb-3 text-red-500">
            <span className="">{run.failReason?.message ?? "Failed for unknown reason"} </span>
        </div>}

        {isLastRunItem && run.status === "cancelled" && <div className="text-md mt-6 mb-3 text-red-500">
            <span>Cancelled by user</span>
        </div>}

        <div>
            <div className="text-xs flex justify-between gap-2 items-start">
                <div className="flex flex-row flex-wrap gap-1 items-center -ml-2">

                    {actionBarScores.map((scoreConfig) => (
                        <ActionBarScoreForm
                            key={scoreConfig.name}
                            session={session}
                            item={item}
                            scoreConfig={scoreConfig}
                        />
                    ))}

                    {/* { isOutput && <Button variant="ghost" size="sm" asChild>
                        <Link to={`/sessions/${session.handle}?${toQueryParams({ ...listParams, itemId: item.id })}`}>
                            <MessageCirclePlus />Comment
                        </Link>
                    </Button> } */}

                    { remainingScores.length > 0 && <ScoreDialog
                        session={session}
                        item={item}
                        open={scoreDialogOpen}
                        onOpenChange={setScoreDialogOpen}
                        scoreConfigs={remainingScores}
                    /> }

                    { run.status !== "in_progress" && isLastRunItem && <Button variant="ghost" size="sm" asChild>
                        <Link to={`/sessions/${session.handle}/runs/${run.id}?${toQueryParams(listParams)}`}><InfoIcon className="size-4" />Run</Link>
                    </Button> }


                    {/* {hasErrors && <Button variant="ghost" size="sm" onClick={() => { debugRun(run) }}>
                        <SquareTerminal />Debug
                    </Button>} */}
                </div>

                {/* { isLastRunItem && <div className="flex flex-row  items-center text-sm -mr-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                        <Link to={`/sessions/${session.handle}/runs/${run.id}?${toQueryParams(listParams)}`}><WrenchIcon className="size-4" />Run</Link>
                    </Button>
                </div> } */}
            </div>
        </div>

        {isSmallSize && <div className={`relative mt-4 mb-2`}>
            <CommentsThread
                item={item}
                session={session}
                selected={isSelected}
                small={true}
                singleLineMessageHeader={true}
                onSelect={onSelect}
            />
        </div>}

    </div>
}


function ScoreDialog({ session, item, open, onOpenChange, scoreConfigs }: { session: SessionWithCollaboration, item: SessionItemWithCollaboration, open: boolean, onOpenChange: (open: boolean) => void, scoreConfigs: ScoreConfig[] }) {
    const { me } = useSessionContext();
    const fetcher = useFetcher();

    // const allScoreConfigs = itemConfig?.scores ?? [];

    const schema = z.object(
        Object.fromEntries(
            scoreConfigs.map((scoreConfig) => [
                scoreConfig.name,
                scoreConfig.schema.optional().nullable()
            ])
        )
    )

    const defaultValues: Record<string, any> = {};
    for (const score of item.scores ?? []) {
        if (score.deletedAt || score.createdBy !== me.id) {
            continue;
        }
        defaultValues[score.name] = score.value;
    }

    const form = useForm({
        resolver: zodResolver<any, any, any>(schema),
        values: defaultValues
    });

    const submit = (data: z.infer<typeof schema>) => {
        const payload = Object.entries(data).map(([name, value]) => ({ name, value }));

        // @ts-ignore i don't know why but payload as array is not correct body but it's correct JSON.
        fetcher.submit(payload, {
            method: 'patch',
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
                <Button variant="ghost" size="sm">
                    <CircleGauge />Scores <ChevronDown />
                </Button>
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
                            <div className="space-y-2">
                                {scoreConfigs.map((scoreConfig) => (
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


function ActionBarScoreForm({ session, item, scoreConfig }: { session: SessionWithCollaboration, item: SessionItemWithCollaboration, scoreConfig: ScoreConfig }) {
    const { me } = useSessionContext();
    const fetcher = useFetcher();
    const revalidator = useRevalidator();

    // Get the current score value for this user
    const score = item.scores?.find(
        score => score.name === scoreConfig.name &&
            score.createdBy === me.id &&
            !score.deletedAt
    );

    const [value, setValue] = useState<any>(score?.value ?? null);

    // external data sync
    useEffect(() => {
        setValue(score?.value ?? null);
    }, [score?.value]);

    const ActionBarComponent = scoreConfig.actionBarComponent;

    if (!ActionBarComponent) {
        return null;
    }

    // const isRunning = fetcher.state !== 'idle';

    const submit = async (value: any) => {
        const payload = [{ name: scoreConfig.name, value }];

        // @ts-ignore - fetcher.submit accepts JSON payload
        fetcher.submit(payload, {
            method: 'patch',
            action: `/sessions/${session.id}/items/${item.id}/scores`,
            encType: 'application/json'
        });
    };

    // Handle fetcher errors
    useEffect(() => {
        if (fetcher.state === 'idle' && fetcher.data?.ok === false) {
            console.error(fetcher.data.error);
            alert(fetcher.data.error.message);
        } else if (fetcher.state === 'idle' && fetcher.data?.ok === true) {
            revalidator.revalidate();
        }
    }, [fetcher.state, fetcher.data]);

    return (<form method="post" onSubmit={(e) => { e.preventDefault(); submit(value); }}>
        <ActionBarComponent
            value={value}
            onChange={submit}
            name={scoreConfig.name}
        />
    </form>
    );
}

