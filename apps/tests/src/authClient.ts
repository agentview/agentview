import 'dotenv/config'
import { createAuthClient } from "better-auth/client"
import { apiKeyClient, organizationClient } from "better-auth/client/plugins"
// import type { Invitation } from "agentview"

if (!process.env.AGENTVIEW_API_BASE_URL) {
  throw new Error('AGENTVIEW_API_BASE_URL is not set')
}

export const authHeaders = new Headers();

export const authClient = createAuthClient({
  baseURL: process.env.AGENTVIEW_API_BASE_URL,
  plugins: [
      // adminClient(),
      apiKeyClient(),
      organizationClient()
  ],
  fetchOptions: {
    onSuccess({ response }) {
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        // Parse the set-cookie header to extract cookie values
        // Format: "cookieName=value; Path=/; HttpOnly; ..."
        // Multiple cookies may be separated by commas
        const cookies = setCookieHeader.split(',').map(cookie => {
          // Extract just the name=value part (before the first semicolon)
          return cookie.split(';')[0].trim();
        });
        // Set the Cookie header with all extracted cookies
        authHeaders.set("Cookie", cookies.join('; '));
      }
    },
    headers: authHeaders,
    throw: true
  },
})

// export async function inviteMember(email: string, role: "admin" | "user") {
//   const response = await fetch(`${process.env.AGENTVIEW_API_BASE_URL}/api/invitations`, {
//     method: "POST",
//     body: JSON.stringify({ email, role }),
//     headers: {
//       "Content-Type": "application/json",
//       "Cookie": authHeaders.get("Cookie") || "",
//     },
//   });

//   if (!response.ok) { 
//     throw new Error(`Failed to invite member: ${email}`);
//   }

//   return await response.json() as Invitation
// }