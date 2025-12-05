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
import { NotificationBadge } from "~/components/internal/NotificationBadge";

// Removed Framework Mode type import
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { authClient } from "~/lib/auth-client";
import { SessionContext } from "~/lib/SessionContext";
import { apiFetch } from "~/lib/apiFetch";
import { updateRemoteConfig } from "~/lib/remoteConfig";
import { config } from "~/config";
import { type Member, allowedSessionLists } from "~/lib/shared/apiTypes";
import { Button } from "~/components/ui/button";
import { getCurrentAgent } from "~/lib/currentAgent";
import { matchPath } from "react-router";
import { UserAvatar } from "~/components/internal/UserAvatar";

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

  await updateRemoteConfig(config); // update schema on every page load

  const membersResponse = await apiFetch<Member[]>('/api/members');

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

  const member: Member = {
    id: session.data.user.id,
    email: session.data.user.email,
    name: session.data.user.name,
    role: session.data.user.role,
    image: session.data.user.image ?? null,
    createdAt: session.data.user.createdAt.toISOString(),
  }

  return {
    me: member,
    members: membersResponse.data,
    locale,
    listStats,
    agent
  };
}

function Component() {
  const { me, members, locale, listStats, agent } = useLoaderData<typeof loader>()
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

  // Get unseen counts for badges
  const prodUnseenCount = getUnseenCount(agent, "prod")
  const playgroundPrivateUnseenCount = getUnseenCount(agent, "playground_private")
  const playgroundSharedUnseenCount = getUnseenCount(agent, "playground_shared")
  
  const customRoutes = config.customRoutes?.filter(route => route.scope === "loggedIn");

  return (<SessionContext.Provider value={{ me, members, locale }}>

    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="border-r">

          {!isSettings && <><SidebarHeader >
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="font-medium">
                      <img src="/symbol_light.svg" className="size-4" alt="AgentView Logo" />
                      {agent}
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

                <Form action={`/sessions/new?agent=${agent}&list=playground_private`} method="post" className="flex flex-col items-stretch relative mt-1 px-1">
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
                      <SidebarMenuButton asChild isActive={isMenuLinkActive(`/sessions?agent=${agent}&list=prod`)} className={"justify-between"}>
                        <Link to={`/sessions?agent=${agent}&list=prod`}>
                          <div className="flex flex-row items-center gap-2"><MessageCircle className="h-4 w-4" /> Production</div>
                          {prodUnseenCount > 0 && <NotificationBadge>{prodUnseenCount}</NotificationBadge>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton><WrenchIcon className="h-4 w-4" />Playground</SidebarMenuButton>
                      <SidebarMenuSub className="mr-0 pr-0">
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isMenuLinkActive(`/sessions?agent=${agent}&list=playground_private`)} className={"justify-between"}>
                            <Link to={`/sessions?agent=${agent}&list=playground_private`}>
                              <div>Private</div>
                              {playgroundPrivateUnseenCount > 0 && <NotificationBadge>{playgroundPrivateUnseenCount}</NotificationBadge>}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem >
                          <SidebarMenuSubButton asChild isActive={isMenuLinkActive(`/sessions?agent=${agent}&list=playground_shared`)}  className={"justify-between"}>
                            <Link to={`/sessions?agent=${agent}&list=playground_shared`}>
                              <div>Shared</div>
                              {playgroundSharedUnseenCount > 0 && <NotificationBadge>{playgroundSharedUnseenCount}</NotificationBadge>}
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
                    <SidebarMenuButton asChild isActive={isMenuLinkActive("/settings/api-keys")}>
                      <Link to="/settings/api-keys">
                        <UserIcon className="h-4 w-4" />
                        <span>API Keys</span>
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

              { me.role === "admin" && <SidebarGroup>
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

              { me.role === "admin" && <SidebarGroup>
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
                      <UserAvatar image={me.image} />
                      {/* <UserIcon /> */}
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium truncate">{me.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{me.email}</span>
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