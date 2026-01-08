import "@agentview/utils/loadEnv"

import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { apiKey, organization } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db__dangerous } from "./db";
import { getStudioURL } from "./getStudioURL";
import { colorValues } from "agentview/colors";
import { addEmail } from "./email";
import { requireValidInvitation } from "./invitations";
import { getAllowedOrigin } from "./getAllowedOrigin";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
    // trustedOrigins: [getStudioURL()],
    trustedOrigins: async (request) => {
        const allowedOrigin = getAllowedOrigin(request.headers);
        if (allowedOrigin) {
            return [allowedOrigin];
        }

        return [];
    },

    database: drizzleAdapter(db__dangerous, {
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
            },
            enableMetadata: true
        }),
        organization({
            async sendInvitationEmail(invitation) {
                const studioUrl = getStudioURL(invitation.organization.id);
                const signupUrl = `${studioUrl}/accept-invitation?invitationId=${encodeURIComponent(invitation.id)}`;
                const organization = invitation.organization;

                console.log('############ SENDING INVITATION EMAIL ############');

                const { data, error } = await resend.emails.send({
                    from: 'AgentView <noreply@agentview.app>',
                    to: [invitation.email],
                    subject: `You're invited to join ${organization.name}`,
                    html: `<p>Hello,</p>
<p>You've been invited to join <strong>${organization.name}</strong> as a <strong>${invitation.role}</strong>.</p>
<p>To accept your invitation and create your account, please click the link below:</p>
<p><a href="${signupUrl}">Accept Invitation</a></p>
<p>If you did not expect this invitation, you can safely ignore this email.</p>
<p>Best regards,<br/>The AgentView Team</p>`,
                    text: `Hello,

You've been invited to join ${organization.name} as ${invitation.role}.

To accept your invitation and create your account, please visit:
${signupUrl}

If you did not expect this invitation, you can safely ignore this email.

Best regards,
The AgentView Team`,
                });

                if (error) {
                    console.error("Error!");
                    console.error({ error });
                }
                else {
                    console.log("Success!");
                    console.log({ data });
                }

            },
        })
    ],
    hooks: {
        before: createAuthMiddleware(async (ctx) => {

            // When invitation is provided, validate it
            if (ctx.path === "/sign-up/email") {
                if (ctx.body.invitationId) {
                    await requireValidInvitation(ctx.body.invitationId, undefined, ctx.body.email)
                }
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

                // TODO: does it work?

                await auth.api.updateUser({
                    body: {
                        image
                    },
                    headers
                })

                // await db__dangerous.update(users).set({
                //     image: image
                // }).where(eq(users.email, ctx.body.email))

                /**
                 * This is commented for now. We rely on manual accept in UI or auto-accept on the front-end side.
                 */
                // // If sign-up was done via invitation to org, auto-accept it.
                // if (ctx.body.invitationId) {
                //     await auth.api.acceptInvitation({
                //         body: {
                //             invitationId: ctx.body.invitationId
                //         },
                //         headers
                //     })
                // }
            }
        })
    },
    telemetry: {
        enabled: false
    }
})