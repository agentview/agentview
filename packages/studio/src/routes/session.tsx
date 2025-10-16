import { useLoaderData, useFetcher, Outlet, Link, Form, data, useParams, useSearchParams, useNavigate, useRevalidator } from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import { Button } from "~/components/ui/button";
import { Header, HeaderTitle } from "~/components/header";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseSSE } from "~/lib/parseSSE";
import { apiFetch } from "~/lib/apiFetch";
import { getAPIBaseUrl } from "~/lib/getAPIBaseUrl";
import { getLastRun, getAllSessionItems, getVersions, getActiveRuns } from "~/lib/shared/sessionUtils";
import { type Run, type Session, type SessionItem } from "~/lib/shared/apiTypes";
import { getListParams, toQueryParams } from "~/lib/listParams";
import { PropertyList, PropertyListItem, PropertyListTextValue, PropertyListTitle } from "~/components/PropertyList";
import { AlertCircleIcon, CheckIcon, ChevronDown, ChevronsDownUp, CircleCheck, CircleDollarSign, CircleDollarSignIcon, CircleGauge, EllipsisVerticalIcon, FilePenLineIcon, InfoIcon, MessageCircleIcon, MessageCirclePlus, MessageSquareTextIcon, PencilIcon, PencilLineIcon, PenTool, PlayCircleIcon, ReceiptIcon, ReceiptText, SendHorizonalIcon, SettingsIcon, Share, SquareIcon, TagsIcon, ThumbsDown, ThumbsUp, TimerIcon, UserIcon, UsersIcon, WorkflowIcon, WrenchIcon } from "lucide-react";
import { useFetcherSuccess } from "~/hooks/useFetcherSuccess";
import { useSessionContext } from "~/lib/SessionContext";
import type { SessionItemConfig, AgentConfig, ScoreConfig } from "~/types";
import { AVFormError, AVFormField } from "~/components/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ItemsWithCommentsLayout } from "~/components/ItemsWithCommentsLayout";
import { CommentsThread } from "~/components/comments";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { config } from "~/config";
import { findItemConfig, requireAgentConfig, requireItemConfig } from "~/lib/config";
import { Loader } from "~/components/Loader";
import { Alert, AlertDescription } from "~/components/ui/alert";
import type { BaseError } from "~/lib/errors";
import { DisplayProperties } from "~/components/DisplayProperties";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Form as HookForm } from "~/components/ui/form";
import { TagPill } from "~/components/TagPill";
import { useRerender } from "~/hooks/useRerender";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";

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

function Component() {
    const loaderData = useLoaderData<typeof loader>();
    return <SessionPage key={loaderData.session.id} />
}

function SessionPage() {
    const loaderData = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const { user } = useSessionContext();

    const [watchedRun, setWatchedRun] = useState<Run | undefined>(undefined)

    // Session with applied local watched run
    const session = {
        ...loaderData.session,
        runs: loaderData.session.runs.map((run: Run) => {
            if (run.id === watchedRun?.id) {
                return watchedRun
            }
            return run;
        })
    }

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

                    // setStreaming(true)

                    for await (const event of parseSSE(response)) {

                        setWatchedRun((prevWatchedRun) => {
                            if (event.event === 'run.snapshot') {
                                return event.data;
                            }

                            if (!prevWatchedRun) {
                                console.warn("This is probably error state.")
                                return prevWatchedRun
                            }

                            if (event.event === 'run.state') {
                                return {
                                    ...prevWatchedRun,
                                    ...event.data
                                }
                            }
                            else if (event.event === 'item.created') {
                                console.log('item.created', event.data)
                                return {
                                    ...prevWatchedRun,
                                    sessionItems: [...prevWatchedRun.sessionItems, event.data]
                                }
                            }
                            else {
                                console.warn('Unknown event type', event.event)
                                throw new Error('Unknown event type')
                            }
                        })
                    }

                } catch (error) {
                    console.error(error)
                } finally {
                    setWatchedRun(undefined)
                    revalidator.revalidate();
                }
            })()
        }

    }, [lastRun?.state])

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
                {session.client.simulatedBy === user.id && <ShareForm session={session} />}
            </Header>
            <div className="flex-1 overflow-y-auto">

                <div className="p-6 border-b">
                    <SessionDetails session={session} agentConfig={agentConfig} />
                </div>

                <div ref={bodyRef}>
                    <ItemsWithCommentsLayout items={getActiveRuns(session).map((run) => {
                        return run.sessionItems.map((item, index) => {

                            const isLastRunItem = index === run.sessionItems.length - 1;

                            const hasComments = item.commentMessages.filter((m: any) => !m.deletedAt).length > 0
                            const isSelected = selectedItemId === item.id;

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
                                    {!styles.isSmallSize && <div className={`absolute text-muted-foreground text-xs font-medium flex flex-row gap-1 z-10`} style={{ left: `${styles.padding + styles.textWidth + styles.commentButtonPadding}px` }}>
                                        {!isSelected && <Button className="group-hover:visible invisible" variant="outline" size="icon_xs" onClick={() => { setselectedItemId(item.id) }}>
                                            <MessageCirclePlus className="size-3" />
                                        </Button>}
                                    </div>}

                                    <div className={`relative`} style={{ marginLeft: `${styles.padding}px`, width: `${styles.textWidth}px` }}>

                                        <div data-item onClick={() => { setselectedItemId(item.id) }}>
                                            {content}
                                        </div>

                                        {isLastRunItem && run.state !== "in_progress" && <MessageFooter
                                            session={session}
                                            run={run}
                                            listParams={listParams}
                                            item={item}
                                            onSelect={() => { setselectedItemId(item.id) }}
                                            isSelected={isSelected}
                                            onUnselect={() => { setselectedItemId(undefined) }}
                                            isSmallSize={styles.isSmallSize}
                                        />}


                                        {isLastRunItem && run.state === "in_progress" && <div className="text-muted-foreground mt-5">
                                            <Loader />
                                        </div>}

                                        {isLastRunItem && run.state === "failed" && <div className="border rounded-md flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 text-sm my-2">
                                            <AlertCircleIcon className="w-4 h-4 text-red-500" />
                                            <span>{run.failReason?.message ?? "Unknown reason"}</span>
                                        </div>}

                                    </div>
                                </div>,
                                commentsComponent: !styles.isSmallSize && (hasComments || (isSelected)) ?
                                    <CommentsThread
                                        item={item}
                                        session={session}
                                        selected={isSelected}
                                        onSelect={(a) => { setselectedItemId(a?.id) }}
                                    /> : undefined
                            }
                        })
                    }).flat()} selectedItemId={selectedItemId}
                        commentsContainer={{
                            style: {
                                width: `${styles.commentsWidth}px`,
                                left: `${styles.padding + styles.textWidth + styles.commentButtonWidth + styles.commentButtonPadding * 2}px`
                            }
                        }}
                    />

                </div>

            </div>


            {session.client.simulatedBy === user.id && <InputForm session={session} agentConfig={agentConfig} styles={styles} />}

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
                        {versions.length === 0 && <span className="text-muted-foreground">-</span>}
                        {versions.length > 0 && <div className="flex flex-row gap-1">{versions.map(version => {
                            const versionString = (version?.version ?? "") + "." + (version?.env ?? "")
                            return <TagPill key={versionString} size="sm">{versionString}</TagPill>
                        })}</div>}
                    </PropertyListTextValue>
                </PropertyListItem>

                {agentConfig.displayProperties && <DisplayProperties displayProperties={agentConfig.displayProperties} inputArgs={{ session }} />}
            </PropertyList>
        </div>
    );
}

function ShareForm({ session }: { session: Session }) {
    const fetcher = useFetcher();
    return <fetcher.Form method="put" action={`/clients/${session.client.id}/share`}>
        <input type="hidden" name="isShared" value={session.client.isShared ? "false" : "true"} />
        {/* <Button variant={session.client.isShared ? "default" : "outline"} className="bg-cyan-700" size="xs" type="submit">
            <UsersIcon  /> {session.client.isShared ? "Shared" : "Share"}
        </Button> */}
        <Button variant={"outline"} size="xs" type="submit">
            <UsersIcon fill={session.client.isShared ? "black" : "none"} stroke={session.client.isShared ? "none" : "black"} /> {session.client.isShared ? "Shared" : "Share"}
        </Button>

        {/* <Button variant={"outline"} size="xs" type="submit">
            <UsersIcon />
            {session.client.isShared ? "Shared" : "Share"}
        </Button> */}
    </fetcher.Form>
}

function InputForm({ session, agentConfig, styles }: { session: Session, agentConfig: AgentConfig, styles: Record<string, number> }) {
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
        <div className={`p-6 pr-0`} style={{ maxWidth: `${styles.textWidth + styles.padding}px` }}>
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

        </div>
    </div>
}

export const sessionRoute: RouteObject = {
    Component,
    loader,
}


type MessageFooterProps = {
    session: Session,
    run: Run,
    listParams: ReturnType<typeof getListParams>,
    item: SessionItem,
    onSelect: () => void,
    isSelected: boolean,
    onUnselect: () => void,
    isSmallSize: boolean
}

function MessageFooter(props: MessageFooterProps) {
    const { session, run, listParams, item, onSelect, isSelected, onUnselect, isSmallSize } = props;
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false);

    const allScoreConfigs = getAllScoreConfigs(session, item);
    const actionBarScores = allScoreConfigs.filter(scoreConfig => scoreConfig.actionBarComponent);

    return <div className="mt-3 mb-8 ">
        <div>
            <div className="text-xs flex justify-between gap-2 items-start">
                <div className="flex flex-row flex-wrap gap-1.5 items-center">
                    {actionBarScores.map((scoreConfig) => (
                        <ActionBarScoreForm
                            key={scoreConfig.name}
                            session={session}
                            item={item}
                            scoreConfig={scoreConfig}
                        />
                    ))}
                    <Button variant="outline" size="xs" asChild>
                        <Link to={`/sessions/${session.handle}?${toQueryParams({ ...listParams, itemId: item.id })}`}>
                            <MessageCirclePlus />Comment
                        </Link>
                    </Button>
                    <ScoreDialog
                        session={session}
                        item={item}
                        open={scoreDialogOpen}
                        onOpenChange={setScoreDialogOpen}
                    />
                    <div className="bg-[#E9DDF3] text-black/65 h-[28px] border rounded-md flex items-center justify-center px-2 text-sm font-semibold gap-1"><div>Test score</div> <ChevronDown className="size-4" /></div>
                    <div className="bg-[#DBE6DD] text-black/65 h-[28px] border rounded-md flex items-center justify-center px-2 text-sm font-semibold gap-1"><ThumbsUp className="size-4" /><div>Like</div></div>
                    <div className="bg-white text-[#68776B] h-[28px] border rounded-md flex items-center justify-center px-2 text-sm font-semibold gap-1"><ThumbsUp className="size-4" /><div>Like</div></div>


                    {/* <div className="bg-[#E9DDF3] text-black/65 h-[20px] rounded-md flex items-center justify-center px-2 text-xs font-medium gap-1"><div>Good, not Great</div> <ChevronDown className="size-3" /></div> */}
                    {/* <div className="bg-[#E9DDF3] text-black/65 h-[28px] border rounded-md flex items-center justify-center px-2 text-sm font-semibold gap-1">
                        <div>Good, not Great</div> <ChevronDown className="size-4" />
                    </div> */}

                </div>

                <div className="flex flex-row  items-center text-sm">
                    <Button variant="ghost" size="xs" className="text-muted-foreground" asChild>
                        <Link to={`/sessions/${session.handle}/runs/${run.id}?${toQueryParams(listParams)}`}><WrenchIcon className="size-4" />Run</Link>
                    </Button>
                </div>
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
                scoreConfig.schema.optional().nullable()
            ])
        )
    )

    const defaultValues: Record<string, any> = {};
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
                <Button variant="outline" size="xs">
                    <CircleGauge />Score <ChevronDown />
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


function ActionBarScoreForm({ session, item, scoreConfig }: { session: Session, item: SessionItem, scoreConfig: ScoreConfig }) {
    const { user } = useSessionContext();
    const fetcher = useFetcher();
    const revalidator = useRevalidator();

    // Get the current score value for this user
    const score = item.scores?.find(
        score => score.name === scoreConfig.name &&
            score.createdBy === user.id &&
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
            method: 'put',
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

