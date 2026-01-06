// import { db__dangerous } from "./db";
// import { invitations } from "./schemas/schema";
// import { addEmail } from "./email";
import { APIError } from "better-auth";
import { invitations } from "./schemas/auth-schema";
import { eq, and } from "drizzle-orm";
import { withOrg } from "./withOrg";

export async function requireValidInvitation(invitationId: string, organizationId: string, email?: string) {
    const invitation = await withOrg(organizationId, async tx => {
        return await tx.query.invitations.findFirst({
            where: and(
                eq(invitations.id, invitationId),
                eq(invitations.organizationId, organizationId),
                eq(invitations.status, "pending") // it's important this condition is here. There might be multiple historical invitations, only one pending though.
            )
        })
    })

    // const invitation = await db__dangerous.query.invitations.findFirst({
    //     where: and(
    //         eq(invitations.id, invitationId),
    //         eq(invitations.organizationId, organizationId),
    //         eq(invitations.status, "pending") // it's important this condition is here. There might be multiple historical invitations, only one pending though.
    //     )
    // })

    if (!invitation) {
        throw new APIError("BAD_REQUEST", {
            message: "Couldn't find invitation.",
        });
    }

    if (email && invitation.email !== email) {
        throw new APIError("BAD_REQUEST", {
            message: "Couldn't find invitation.",
        });
    }

    if (invitation.expiresAt < new Date()) {
        throw new APIError("BAD_REQUEST", {
            message: "Invitation expired."
        })
    }

    return invitation;
}
