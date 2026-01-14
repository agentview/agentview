import { createBrowserRouter, type NonIndexRouteObject, type RouteObject } from "react-router";
import { sidebarLayoutRoute } from "./routes/sidebar_layout";
import { homeRoute } from "./routes/home";
import { userUpdateRoute } from "./routes/userUpdate";
import { sessionsRoute } from "./routes/sessions";
import { sessionsIndexRoute } from "./routes/sessionsIndex";
import { sessionNewRoute } from "./routes/sessionNew";
import { sessionRoute } from "./routes/session";
import { sessionItemRoute } from "./routes/sessionItem";
import { sessionItemCommentsRoute } from "./routes/sessionItemComments";
import { sessionItemCommentRoute } from "./routes/sessionItemComment";
import { envRoute } from "./routes/env";
import { logoutRoute } from "./routes/logout";
import { loginRoute } from "./routes/login";
import { rootRoute } from "./root";
import { sessionRunRoute } from "./routes/sessionRun";
import { settingsRoute } from "./routes/settings";
import type { AgentViewConfig } from "agentview/types";
import { sessionItemScoresRoute } from "./routes/sessionItemScores";
import { uiRoute } from "./routes/ui";

export function routes(customRoutes: AgentViewConfig["customRoutes"]): RouteObject[] {
  const rootCustomRoutes = (customRoutes?.filter(route => route.type === "root") || []).map(route => route.route);
  const agentCustomRoutes = (customRoutes?.filter(route => route.type === "agent") || []).map(route => route.route);

  return [
    {
      path: "/",
      ...rootRoute,
      children: [
        {
          path: "/",
          ...sidebarLayoutRoute,
          children: [
            {
              ...homeRoute,
              index: true,
            },
            {
              path: "env",
              ...envRoute,
            },
            // {
            //   path: "settings",
            //   ...settingsRoute,
            //   children: [
            //     // {
            //     //   path: "profile",
            //     //   ...settingsProfileRoute,
            //     // },
            //     // {
            //     //   path: "api-keys",
            //     //   ...settingsApiKeysRoute,
            //     // },
            //     // {
            //     //   path: "password",
            //     //   ...settingsPasswordRoute,
            //     // },
            //     // {
            //     //   path: "members",
            //     //   ...membersRoute,
            //     //   children: [
            //     //     {
            //     //       path: "invitations/new",
            //     //       ...membersInviteRoute,
            //     //     },
            //     //     {
            //     //       path: "invitations/:invitationId/cancel",
            //     //       ...membersInviteCancelRoute,
            //     //     },
            //     //     {
            //     //       path: ":memberId/edit",
            //     //       ...membersEditRoute,
            //     //     },
            //     //     {
            //     //       path: ":memberId/delete",
            //     //       ...membersDeleteRoute,
            //     //     },
            //     //   ],
            //     // },
            //     {
            //       path: "config",
            //       ...configsRoute,
            //     },
            //     // {
            //     //   path: "emails",
            //     //   ...emailsRoute,
            //     // },
            //     // {
            //     //   path: "emails/:id",
            //     //   ...emailDetailRoute,
            //     // },
            //   ]
            // },
            {
              path: "users/:userId/update",
              ...userUpdateRoute,
            },
            {
              path: "sessions",
              ...sessionsRoute,
              children: [
                {
                  ...sessionsIndexRoute,
                  index: true,
                },
                {
                  path: "new",
                  ...sessionNewRoute,
                },
                {
                  path: ":id",
                  ...sessionRoute,
                  children: [
                    {
                      path: "items/:itemId",
                      ...sessionItemRoute,
                    },
                    {
                      path: "runs/:runId",
                      ...sessionRunRoute,
                    },
                    {
                      path: "items/:itemId/comments",
                      ...sessionItemCommentsRoute,
                    },
                    {
                      path: "items/:itemId/comments/:commentId",
                      ...sessionItemCommentRoute,
                    },
                    {
                      path: "items/:itemId/scores",
                      ...sessionItemScoresRoute,
                    }
                  ],
                },
              ],
            },
            {
              path: "logout",
              ...logoutRoute
            },
            ...agentCustomRoutes
          ],
        },
        {
          path: "login",
          ...loginRoute
        },
        // {
        //   path: "signup",
        //   ...signupRoute
        // },
        // {
        //   path: "accept-invitation",
        //   ...acceptInvitationRoute
        // },
        {
          path: "ui",
          ...uiRoute
        },
        ...rootCustomRoutes
      ],
    } as NonIndexRouteObject
  ]
}