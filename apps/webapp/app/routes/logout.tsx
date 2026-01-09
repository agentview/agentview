import { redirect, data } from "react-router";
import type { Route } from "./+types/logout";
import { authClient } from "~/authClient";

export async function clientLoader({ request }: Route.LoaderArgs) {
  const response = await authClient.signOut();
  if (response.error) {
    throw data(response.error.message ?? "Logout failed", { status: response.error.status })
  }

  return redirect('/login');
}

export default function LogoutPage() {
  return <div>Logging out...</div>;
}