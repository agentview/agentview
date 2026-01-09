import { authClient } from "~/authClient";
import type { Route } from "./+types/dashboard";
import { betterAuthErrorToBaseError } from "@agentview/studio/lib/errors";
import { data, redirect } from "react-router";

export async function clientLoader({ request }: Route.LoaderArgs) {
  const listOrganizationsResponse = await authClient.organization.list();
  if (listOrganizationsResponse.error) {
    throw data(betterAuthErrorToBaseError(listOrganizationsResponse.error))
  }

  const organizations = listOrganizationsResponse.data;

  if (organizations.length === 0) {
    return;
  }

  const activeOrganizationId = window.localStorage.getItem("activeOrganizationId");
  const activeOrganization = organizations.find(organization => organization.id === activeOrganizationId);
  
  if (activeOrganization) {
    return redirect(`/orgs/${activeOrganization.id}`);
  }
  else {
    window.localStorage.setItem("activeOrganizationId", organizations[0].id);
    return redirect(`/orgs/${organizations[0].id}`);
  }
}

export default function Home() {
  return <div>No Organizations Found.</div>;
}
