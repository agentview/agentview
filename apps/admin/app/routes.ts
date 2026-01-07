import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/app/layout.tsx", [
        index("routes/app/home.tsx"),
    ]),
    
    layout("routes/public/layout.tsx", [
        route("login", "routes/public/login.tsx"),
    ]),
    route("logout", "routes/logout.tsx"),

] satisfies RouteConfig;
