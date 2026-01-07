import { redirect, data, type RouteObject } from "react-router";
import { authClient } from "../../authClient";

export async function clientLoader() {
  const response = await authClient.signOut();
  if (response.error) {
    throw data(response.error.message ?? "Logout failed", { status: response.error.status })
  }

  return redirect('/');
}

export default function LogoutPage() {
  return <div>Logout page</div>;
}