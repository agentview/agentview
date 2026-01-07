import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/app/layout.tsx", [
        index("routes/app/home.tsx"),
        route("logout", "routes/app/logout.tsx"),
        
        route("orgs/:orgId", "routes/app/org/layout.tsx", [
            index("./routes/app/org/home.tsx"),
          ]),
    ]),
    
    layout("routes/public/layout.tsx", [
        route("login", "routes/public/login.tsx"),
    ]),

] satisfies RouteConfig;
