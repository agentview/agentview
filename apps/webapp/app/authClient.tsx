import { apiKeyClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_AGENTVIEW_API_URL + "/api/auth",
    plugins: [
        apiKeyClient(),
        organizationClient()
    ]
})