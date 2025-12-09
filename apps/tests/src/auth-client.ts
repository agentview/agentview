import 'dotenv/config'
import { createAuthClient } from "better-auth/client"
import { adminClient, apiKeyClient } from "better-auth/client/plugins"

if (!process.env.AGENTVIEW_API_BASE_URL) {
  throw new Error('AGENTVIEW_API_BASE_URL is not set')
}

export const authClient = createAuthClient({
  baseURL: process.env.AGENTVIEW_API_BASE_URL,
  plugins: [
    adminClient(),
    apiKeyClient()
  ]
})
