import { createAuthClient } from "better-auth/react"
import { adminClient, apiKeyClient, organizationClient } from "better-auth/client/plugins"
import { config } from "../config"
import { redirect } from "react-router"

export function createBetterAuthClient({ baseURL }: { baseURL: string }) {
    return createAuthClient({
        baseURL,
        plugins: [
            adminClient(),
            apiKeyClient(),
            organizationClient()
        ],
        fetchOptions: {
            headers: {
                "X-Organization-Id": config.organizationId
            }
        }
    })
}

export const authClient = createBetterAuthClient({ baseURL: new URL('/api/auth', config.apiBaseUrl).toString() })


export async function getOrganization() {
    const response = await authClient.organization.getFullOrganization({ query: { organizationId: config.organizationId } })

    if (response.error) {
        throw response.error;
    }

    return response.data;
}

export async function getMember(organization: Organization, userId: string) {
    const member = organization.members.find((member) => member.userId === userId);

    if (!member) {
        throw new Error("Member not found");
    }

    return member;
}


export type Member = Awaited<ReturnType<typeof getMember>>;
export type User = Member["user"];
export type Organization = Awaited<ReturnType<typeof getOrganization>>;
