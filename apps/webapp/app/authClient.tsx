import { apiKeyClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

const baseURL = "http://localhost:1990/api/auth"

export const authClient = createAuthClient({
    baseURL,
    plugins: [
        apiKeyClient(),
        organizationClient()
    ]
})