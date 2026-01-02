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
            async sendInvitationEmail(invitation) {
                const studioUrl = getStudioURL();
                const signupUrl = `${studioUrl}/accept-invitation?invitationId=${encodeURIComponent(invitation.id)}`;
                const organization = invitation.organization;

                await addEmail({
                    to: invitation.email,
                    subject: `You're invited to join ${organization.name}`,
                    text: `Hello,

You've been invited to join ${organization.name} as ${invitation.role}.

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
                }, invitation.inviter.user.id);

                // sendOrganizationInvitation({
                //   email: data.email,
                //   invitedByUsername: data.inviter.user.name,
                //   invitedByEmail: data.inviter.user.email,
                //   teamName: data.organization.name,
                //   inviteLink,
                // });
              },

    //         organizationHooks: {
    //             async afterCreateInvitation({ invitation, inviter, organization }) {
    //                 const studioUrl = getStudioURL();
    //                 const signupUrl = `${studioUrl}/signup?invitationId=${encodeURIComponent(invitation.id)}`;

    //                 await addEmail({
    //                     to: invitation.email,
    //                     subject: `You're invited to join ${organization.name}`,
    //                     text: `Hello,
    
    // You've been invited to join ${organization.name} as a ${invitation.role}.
    
    // To accept your invitation and create your account, please visit:
    // ${signupUrl}
    
    // If you did not expect this invitation, you can safely ignore this email.
    
    // Best regards,
    // The AgentView Team`,
    //                     html: `<p>Hello,</p>
    // <p>You've been invited to join <strong>${organization.name}</strong> as a <strong>${invitation.role}</strong>.</p>
    // <p>To accept your invitation and create your account, please click the link below:</p>
    // <p><a href="${signupUrl}">Accept Invitation</a></p>
    // <p>If you did not expect this invitation, you can safely ignore this email.</p>
    // <p>Best regards,<br/>The AgentView Team</p>`
    //                 }, inviter.id);
    //             }
    //         }
        })
    ],
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            const organizationId = ctx.headers?.get("X-Organization-Id");

            // When X-Organization-Id is provided, then sign-up is allowed only with the invitation (no custom sign-ups via Studio)
            if (organizationId && ctx.path === "/sign-up/email") {
                if (!ctx.body.invitationId) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Invitation ID must be provided.",
                    });
                }
                await requireValidInvitation(ctx.body.invitationId, organizationId, ctx.body.email)
            }
        }),
        after: createAuthMiddleware(async (ctx) => {
            // extract headers
            const headers = new Headers();
            const setCookie = ctx.context.responseHeaders?.get("set-cookie");
            headers.set("cookie", setCookie?.split(";")[0] || ""); // Extract just the cookie value

            if (ctx.path === "/sign-up/email") {
                // Generate image property: ${color}:${firstLetterFromName}
                const randomColor = colorValues[Math.floor(Math.random() * colorValues.length)];
                const firstLetter = ctx.body.name ? ctx.body.name.charAt(0).toUpperCase() : "A";
                const image = `color:${randomColor}:${firstLetter}`;

                await db.update(users).set({
                    image: image
                }).where(eq(users.email, ctx.body.email))

                // If sign-up was done via invitation to org, auto-accept it.
                if (ctx.body.invitationId) {
                    await auth.api.acceptInvitation({
                        body: {
                            invitationId: ctx.body.invitationId
                        },
                        headers
                    })
                }
            }
        })
    },
    telemetry: {
        enabled: false
    }
})