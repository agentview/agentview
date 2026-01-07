import type { Route } from "./+types/layout";
import { authClient } from "../../authClient";
import { Outlet, redirect } from "react-router";

export async function clientLoader({ request }: Route.LoaderArgs) {
  const sessionResponse = await authClient.getSession()
  if (sessionResponse.data) {
    return redirect("/");
  }
}

export default function Layout() {
  return <Outlet />
}
