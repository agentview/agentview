import type { Route } from "./+types/layout";
import { authClient } from "../../authClient";
import { redirect, Outlet } from "react-router";

export async function clientLoader({ request }: Route.LoaderArgs) {
  const sessionResponse = await authClient.getSession()
  if (!sessionResponse.data) {
    return redirect("/login");
  }
}

export default function Layout() {
  return <div>
    <h1>App layout</h1>
    <Outlet />
  </div>;
}
