import { redirect, type RouteObject } from "react-router";
import { invalidateCache } from "../lib/swr-cache";

async function loader() {
  invalidateCache();
  localStorage.removeItem("agentview_token");
  return redirect('/');
}

export const logoutRoute : RouteObject = {
  loader
}