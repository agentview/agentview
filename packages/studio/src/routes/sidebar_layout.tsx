import React from "react";
import {
  data,
  Form,
  Link,
  Outlet,
  redirect,
  useFetcher,
  useLoaderData,
  useLocation,
  type LoaderFunctionArgs,
  type RouteObject,
} from "react-router";

import { LogOut, ChevronUp, UserIcon, Edit, Lock, Users, Mail, MessageCircle, Database, Inbox, BotIcon, ChevronsUpDown, ChevronDown, WrenchIcon, CircleGauge, PlusIcon, UsersIcon, StarIcon, Settings, ArrowLeft, LockKeyhole } from "lucide-react"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "../components/ui/sidebar"
import { TagPill } from "~/components/TagPill";

// Removed Framework Mode type import
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { authClient } from "~/lib/auth-client";
import { SessionContext } from "~/lib/SessionContext";
import { apiFetch } from "~/lib/apiFetch";
import { createOrUpdateConfig } from "~/lib/remoteConfig";
import { config } from "~/config";
import { type User, allowedSessionLists } from "~/lib/shared/apiTypes";
import { Button } from "~/components/ui/button";
import { getAgentParamAndCheckForRedirect } from "~/lib/listParams";
import { getCurrentAgent } from "~/lib/currentAgent";
import { matchPath } from "react-router";
import { UserAvatar } from "~/components/UserAvatar";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await authClient.getSession()

  const url = new URL(request.url);
  const relativeUrl = url.pathname + url.search + url.hash;

  if (!session.data) {
    if (relativeUrl !== '/') {
      return redirect('/login?redirect=' + encodeURIComponent(relativeUrl));
    }
    else {
      return redirect('/login');
    }
  }

  const agent = getCurrentAgent(request);

  await createOrUpdateConfig(); // update schema on every page load

  const membersResponse = await apiFetch<User[]>('/api/users');

  if (!membersResponse.ok) {
    throw data(membersResponse.error, { status: membersResponse.status });
  }

  const locale = request.headers.get('accept-language')?.split(',')[0] || 'en-US';

  // Fetch session stats for each session type and list combination
  const listStats: { [sessionType: string]: { [list: string]: { unseenCount: number, hasMentions: boolean } } } = {};

  if (config.agents) {
    for (const agentConfig of config.agents) {
      listStats[agentConfig.name] = {};

      for (const list of allowedSessionLists) {
        const statsUrl = `/api/sessions/stats?agent=${agentConfig.name}&list=${list}`;
        const statsResponse = await apiFetch<{ unseenCount: number, hasMentions: boolean }>(statsUrl);

        if (!statsResponse.ok) {
          throw data(statsResponse.error, { status: statsResponse.status });
        }

        listStats[agentConfig.name][list] = statsResponse.data;
      }
    }
  }

  if (!session.data.user.role) {
    throw data("User not found", { status: 404 });
  }

  const user: User = {
    id: session.data.user.id,
    email: session.data.user.email,
    name: session.data.user.name,
    role: session.data.user.role,
    image: session.data.user.image ?? null,
    createdAt: session.data.user.createdAt.toISOString(),
  }

  return {
    user,
    members: membersResponse.data,
    locale,
    listStats,
    agent
  };
}

function Component() {
  const { user, members, locale, listStats, agent } = useLoaderData<typeof loader>()
  const location = useLocation();

  // Helper function to get unseen count for a specific session type and list name
  const getUnseenCount = (sessionType: string, listName: string) => {
    return listStats[sessionType]?.[listName]?.unseenCount ?? 0
  }

  const isMenuLinkActive = (linkPath: string) => {
    const linkUrl = new URL(linkPath, window.location.origin)
    const pathMatches = matchPath({ path: linkUrl.pathname, end: false }, location.pathname)

    if (!pathMatches) return false

    if (linkPath.startsWith("/sessions")) {
      const pathParams = new URLSearchParams(linkUrl.search)
      const currentParams = new URLSearchParams(location.search)
      const listMatch = pathParams.get('list') === currentParams.get('list')
      const agentMatch = pathParams.get('agent') === currentParams.get('agent')
      return listMatch && agentMatch
    }

    return true
  }

  const isSettings = isMenuLinkActive("/settings")

  const customRoutes = config.customRoutes?.filter(route => route.scope === "loggedIn");

  return (<SessionContext.Provider value={{ user, members, locale }}>

    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="border-r">

          {!isSettings && <><SidebarHeader >
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="font-medium">
                      <img src="/logo_symbol.svg" className="size-4" alt="AgentView Logo" />
                      {agent}
                      {/* Simple Chat <TagPill>1.0.5.dev</TagPill> */}
                      <ChevronDown className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-popper-anchor-width]">

                    {config.agents?.map((agent) => {
                      return <DropdownMenuItem asChild key={agent.name}>
                        <Link to={`/sessions?agent=${agent.name}`}>
                          <span>{agent.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    })}

                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>

              <SidebarMenuItem>

                <Form action={`/sessions/new?agent=${agent}&list=simulated_private`} method="post" className="flex flex-col items-stretch relative mt-1 px-1">
                  <Button variant="outline" size="sm" type="submit">
                    <PlusIcon className="h-4 w-4" />
                    New Session
                  </Button>
                </Form>
              </SidebarMenuItem>
            </SidebarMenu>

          </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Sessions</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isMenuLinkActive(`/sessions?agent=${agent}&list=real`)}>
                        <Link to={`/sessions?agent=${agent}&list=real`}>
                          <MessageCircle className="h-4 w-4" /> Production
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton><WrenchIcon className="h-4 w-4" />Playground</SidebarMenuButton>
                      <SidebarMenuSub className="mr-0">
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isMenuLinkActive(`/sessions?agent=${agent}&list=simulated_private`)}>
                            <Link to={`/sessions?agent=${agent}&list=simulated_private`}>
                              <span>Private</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem >
                          <SidebarMenuSubButton asChild isActive={isMenuLinkActive(`/sessions?agent=${agent}&list=simulated_shared`)}>
                            <Link to={`/sessions?agent=${agent}&list=simulated_shared`}>
                              <span>Shared</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        {/* <SidebarMenuSubItem>
                        <SidebarMenuSubButton>Starred</SidebarMenuSubButton>
                      </SidebarMenuSubItem> */}
                      </SidebarMenuSub>
                    </SidebarMenuItem>

                    {/* <SidebarMenuItem>
                    <SidebarMenuButton><StarIcon className="h-4 w-4" /> Starred</SidebarMenuButton>
                  </SidebarMenuItem> */}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              { customRoutes && <SidebarGroup>
                <SidebarGroupLabel>Pages</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {customRoutes.map((route) => {
                      if (!route.route.path) {
                        throw new Error("Custom route path is required")
                      }

                      return <SidebarMenuItem key={route.route.path}>
                        <SidebarMenuButton asChild isActive={isMenuLinkActive(route.route.path)}>
                          <Link to={route.route.path}>
                            {route.title}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>}

              {/* <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {(!config.agents || config.agents.length === 0) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton className="text-muted-foreground">You don't have any agents yet</SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {config.agents?.map((agent, index) => {
                    if (index > 0) {
                      return null
                    }

                    const realUnseenCount = getUnseenCount(agent.name, "real")
                    const simulatedPrivateUnseenCount = getUnseenCount(agent.name, "simulated_private")
                    const simulatedSharedUnseenCount = getUnseenCount(agent.name, "simulated_shared")

                    return (
                      <SidebarMenuItem key={agent.name}>
                        <SidebarMenuButton>                                <MessageCircle className="h-4 w-4" />
                          Sessions</SidebarMenuButton>
                        <SidebarMenuSub className="mr-0">
                          <SidebarMenuSubItem className={realUnseenCount > 0 ? "flex justify-between items-center" : ""}>
                            <SidebarMenuSubButton asChild>
                              <Link to={`/sessions?agent=${agent.name}`}>
                                <span>Production</span>
                              </Link>
                            </SidebarMenuSubButton>
                            {realUnseenCount > 0 && <NotificationBadge>{realUnseenCount}</NotificationBadge>}
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem className={simulatedPrivateUnseenCount > 0 ? "flex justify-between items-center" : ""}>
                            <SidebarMenuSubButton asChild>
                              <Link to={`/sessions?agent=${agent.name}&list=simulated_private`}>
                                <span>Simulated Private</span>
                              </Link>
                            </SidebarMenuSubButton>

                            {simulatedPrivateUnseenCount > 0 && <NotificationBadge>{simulatedPrivateUnseenCount}</NotificationBadge>}
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem className={simulatedSharedUnseenCount > 0 ? "flex justify-between items-center" : ""}>
                            <SidebarMenuSubButton asChild>
                              <Link to={`/sessions?agent=${agent.name}&list=simulated_shared`}>
                                <span>Simulated Shared</span>
                              </Link>
                            </SidebarMenuSubButton>
                            {simulatedSharedUnseenCount > 0 && <NotificationBadge>{simulatedSharedUnseenCount}</NotificationBadge>}

                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup> */}


            </SidebarContent>

          </>}


          {isSettings && <>
            <SidebarHeader>
              <Button variant="ghost" size="sm" className="justify-start" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to app
                </Link>
              </Button>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Account</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isMenuLinkActive("/settings/profile")}>
                      <Link to="/settings/profile">
                        <UserIcon className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild isActive={isMenuLinkActive("/settings/password")}>
                      <Link to="/settings/password">
                        <LockKeyhole className="h-4 w-4" />
                        <span>Password</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* <SidebarMenuItem>
                    <SidebarMenuButton><WrenchIcon className="h-4 w-4" />Playground</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton><WrenchIcon className="h-4 w-4" />Playground</SidebarMenuButton>
                  </SidebarMenuItem> */}
                </SidebarMenu>
              </SidebarGroup>

              { user.role === "admin" && <SidebarGroup>
                <SidebarGroupLabel>Organisation</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isMenuLinkActive("/settings/members")}>
                      <Link to="/settings/members">
                        <UsersIcon className="h-4 w-4" />
                        <span>Members</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* <SidebarMenuItem>
                    <SidebarMenuButton><WrenchIcon className="h-4 w-4" />Playground</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton><WrenchIcon className="h-4 w-4" />Playground</SidebarMenuButton>
                  </SidebarMenuItem> */}
                </SidebarMenu>
              </SidebarGroup>}

              { user.role === "admin" && <SidebarGroup>
                <SidebarGroupLabel>Dev</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isMenuLinkActive("/settings/config")}>
                        <Link to="/settings/config">
                          <Database className="h-4 w-4" />
                          <span>Config</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>}


              {import.meta.env.DEV && <SidebarGroup>
                <SidebarGroupLabel>Internal</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isMenuLinkActive("/settings/emails")}>
                        <Link to="/settings/emails">
                          <Mail className="h-4 w-4" />
                          <span>Emails</span>
                        </Link>
                      </SidebarMenuButton>

                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>}

            </SidebarContent>
          </>}


          <SidebarFooter className="border-t p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                      <UserAvatar image={user.image} />
                      {/* <UserIcon /> */}
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium truncate">{user.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                      <ChevronUp className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="min-w-[200px]">
                    <DropdownMenuItem asChild>
                      <Link to="/settings/profile">
                        <UserIcon className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings/profile">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to="/logout">
                        <LogOut className="h-4 w-4" />
                        Log out
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>


              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>



        </Sidebar>

        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  </SessionContext.Provider>
  );
}

export const sidebarLayoutRoute: RouteObject = {
  Component,
  loader,
}