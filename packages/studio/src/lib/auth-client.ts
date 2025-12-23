import { createAuthClient } from "better-auth/react"
import { adminClient, apiKeyClient, organizationClient } from "better-auth/client/plugins"
import { config } from "../config"

export function createBetterAuthClient({ baseURL }: { baseURL: string }) {
    return createAuthClient({
        baseURL,
        plugins: [
            adminClient(),
            apiKeyClient(),
            organizationClient()
        ]
    })
}

export const authClient = createBetterAuthClient({ baseURL: new URL('/api/auth', config.apiBaseUrl).toString() })


export async function getActiveOrganization(slug: string) {
    const response = await authClient.organization.getFullOrganization({ query: { organizationSlug: slug } })

    if (response.error) {
        throw new Error(response.error.message);
    }

    return response.data;
}

export async function getActiveMember(organization: Organization, userId: string) {
    const member = organization.members.find((member) => member.userId === userId);

    if (!member) {
        throw new Error("Member not found");
    }

    return member;
}


export type Member = Awaited<ReturnType<typeof getActiveMember>>;
export type User = Member["user"];
export type Organization = Awaited<ReturnType<typeof getActiveOrganization>>;
