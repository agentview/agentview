import {
  data,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  type LoaderFunctionArgs
} from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from "@agentview/studio/components/ui/sidebar";
import { ChevronUp, LockKeyhole, LogOut, Settings, UserIcon, UsersIcon } from "lucide-react";

import { UserAvatar } from "@agentview/studio/components/internal/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@agentview/studio/components/ui/dropdown-menu";
import { betterAuthErrorToBaseError } from "@agentview/studio/lib/errors";
import { matchPath } from "react-router";
import { authClient } from "~/authClient";

export async function clientLoader({ request, params }: LoaderFunctionArgs) {
  const session = await authClient.getSession();
  if (session.error) {
    throw data(betterAuthErrorToBaseError(session.error))
  }
  const user = session.data!.user;

  const organizationResponse = await authClient.organization.getFullOrganization({ query: { organizationId: params.orgId } });
  if (organizationResponse.error) {
    throw data(betterAuthErrorToBaseError(organizationResponse.error))
  }
  const organization = organizationResponse.data;

  const member = organization.members.find((member) => member.userId === user?.id);

  const me = {
    ...user,
    role: member!.role
  }

  const locale = request.headers.get('accept-language')?.split(',')[0] || 'en-US';

  return {
    organization,
    me,
    locale
  };
}

export default function AppLayout() {
  const { organization, me, locale } = useLoaderData<typeof clientLoader>()

  const location = useLocation();

  const isMenuLinkActive = (linkPath: string) => {
    const linkUrl = new URL(linkPath, window.location.origin)
    const pathMatches = matchPath({ path: linkUrl.pathname, end: false }, location.pathname)
    if (!pathMatches) return false
    return true
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="border-r">

          <SidebarHeader>
            { organization.name }
            {/* <Button variant="ghost" size="sm" className="justify-start" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Back to app
              </Link>
            </Button> */}
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
              </SidebarMenu>
            </SidebarGroup>

            {(me.role === "admin" || me.role === "owner") && <SidebarGroup>
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
              </SidebarMenu>
            </SidebarGroup>}

            {/* {(me.role === "admin" || me.role === "owner") && <SidebarGroup>
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
            </SidebarGroup>} */}

          </SidebarContent>


          <SidebarFooter className="border-t p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                      <UserAvatar image={me.image} />
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
  );
}
