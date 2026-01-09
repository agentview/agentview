import { betterAuthErrorToBaseError } from "@agentview/studio/lib/errors";
import { authClient } from "./authClient";
import { data } from "react-router";

export async function requireOrganization(organizationId: string) {
    const organizationResponse = await authClient.organization.getFullOrganization({ query: { organizationId } });
    if (organizationResponse.error) {
        throw data(betterAuthErrorToBaseError(organizationResponse.error))
    }
    return organizationResponse.data;
}