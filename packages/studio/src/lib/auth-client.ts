import { createAuthClient } from "better-auth/react"
import { adminClient, apiKeyClient } from "better-auth/client/plugins"
import { config } from "~/config"

const authBaseUrl = new URL('/api/auth', config.baseUrl).toString();

export const authClient = createAuthClient({
    baseURL: authBaseUrl, // The base URL of your auth server,
    plugins: [
        adminClient(),
        apiKeyClient()
    ]
})
