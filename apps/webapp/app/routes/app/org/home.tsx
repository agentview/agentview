import { redirect } from "react-router";
import type { Route } from "./+types/home";

export async function clientLoader({ params }: Route.LoaderArgs) {
  // Redirect to profile page by default
  return redirect(`/orgs/${params.orgId}/profile`);
}

export default function OrgHome() {
  // This should not render as loader always redirects
  return null;
}
