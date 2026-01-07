import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    // Authenticated routes
    layout("routes/app/layout.tsx", [
        index("routes/app/home.tsx"),

        route("orgs/:orgId", "routes/app/org/layout.tsx", [
            index("routes/app/org/home.tsx"),
            route("profile", "routes/app/org/profile.tsx"),
            route("password", "routes/app/org/password.tsx"),
            route("details", "routes/app/org/details.tsx"),
            route("api-keys", "routes/app/org/api-keys.tsx"),
            route("members", "routes/app/org/members.tsx", [
                route("invitations/new", "routes/app/org/members-invite.tsx"),
                route(":memberId/edit", "routes/app/org/members-edit.tsx"),
                route(":memberId/delete", "routes/app/org/members-delete.tsx"),
                route("invitations/:invitationId/cancel", "routes/app/org/members-invite-cancel.tsx"),
            ]),
        ]),
    ]),

    // Public routes
    layout("routes/public/layout.tsx", [
        route("login", "routes/public/login.tsx"),
        route("signup", "routes/public/signup.tsx"),
    ]),

    // Special routes
    route("logout", "routes/logout.tsx"),
    route("accept-invitation", "routes/accept-invitation.tsx"),

] satisfies RouteConfig;
