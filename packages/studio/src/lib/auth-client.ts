import { createAuthClient } from "better-auth/react"
import { adminClient, apiKeyClient } from "better-auth/client/plugins"
import { config } from "../config"

export function createBetterAuthClient({ baseURL }: { baseURL: string }) {
    return createAuthClient({
        baseURL,
        plugins: [
            adminClient(),
            apiKeyClient()
        ]
    })
}

export const authClient = createBetterAuthClient({ baseURL: new URL('/api/auth', config.apiBaseUrl).toString() })
