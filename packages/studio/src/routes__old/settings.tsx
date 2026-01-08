import { Outlet } from "react-router";
import type { RouteObject } from "react-router";

function Component() {
  return <Outlet />
}

export const settingsRoute: RouteObject = {
  Component,
}