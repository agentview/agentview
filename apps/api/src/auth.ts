import "@agentview/utils/loadEnv"

import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { apiKey, organization } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users } from "./schemas/auth-schema";
import { eq } from "drizzle-orm";
import { getStudioURL } from "./getStudioURL";
import { colorValues } from "agentview/colors";
import { addEmail } from "./email";
import { requireValidInvitation } from "./invitations";

export const auth = betterAuth({
    trustedOrigins: [getStudioURL()],
    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true
    }),
    session: {
        modelName: "authSession"
    },
    emailAndPassword: {
        enabled: true
    },
    plugins: [
        // admin(),
        apiKey({
            keyExpiration: {
                defaultExpiresIn: 60 * 60 * 24 * 365
            },
            rateLimit: {
                enabled: false // for now
            }
        }),
        organization({
            organizationHooks: {
                async afterCreateInvitation({ invitation, inviter, organization }) {
                    const studioUrl = getStudioURL();
                    const signupUrl = `${studioUrl}/signup?invitationId=${encodeURIComponent(invitation.id)}`;

                    await addEmail({
                        to: invitation.email,
                        subject: `You're invited to join ${organization.name}`,
                        text: `Hello,
    
    You've been invited to join ${organization.name} as a ${invitation.role}.
    
    To accept your invitation and create your account, please visit:
    ${signupUrl}
    
    If you did not expect this invitation, you can safely ignore this email.
    
    Best regards,
    The AgentView Team`,
                        html: `<p>Hello,</p>
    <p>You've been invited to join <strong>${organization.name}</strong> as a <strong>${invitation.role}</strong>.</p>
    <p>To accept your invitation and create your account, please click the link below:</p>
    <p><a href="${signupUrl}">Accept Invitation</a></p>
    <p>If you did not expect this invitation, you can safely ignore this email.</p>
    <p>Best regards,<br/>The AgentView Team</p>`
                    }, inviter.id);
                }
            }
        })
    ],
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            console.log(ctx.path);

            
            // In Studio we only allow to sign up users with correct invitation 
            if (ctx.path === "/sign-up/email") {
                if (!ctx.body.invitationId) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Invitation id not provided.",
                    });
                }

                const orgId = ctx.headers?.get("X-Organization-Id");
                if (!orgId) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Organization id must be provided."
                    })
                }
    
                await requireValidInvitation(ctx.body.invitationId, orgId, ctx.body.email)
            }
        }),
        after: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/sign-up/email") {
                // Generate image property: ${color}:${firstLetterFromName}
                const randomColor = colorValues[Math.floor(Math.random() * colorValues.length)];
                const firstLetter = ctx.body.name ? ctx.body.name.charAt(0).toUpperCase() : "A";
                const image = `color:${randomColor}:${firstLetter}`;

                await db.update(users).set({
                    image: image
                }).where(eq(users.email, ctx.body.email))

                // Extract header with Cookie
                const headers = new Headers();
                const setCookie = ctx.context.responseHeaders?.get("set-cookie");
                headers.set("cookie", setCookie?.split(";")[0] || ""); // Extract just the cookie value
            
                await auth.api.acceptInvitation({
                    body: {
                        invitationId: ctx.body.invitationId
                    },
                    headers
                })
            }
        })
    },
    telemetry: {
        enabled: false
    }
})