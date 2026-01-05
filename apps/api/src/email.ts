import { emails } from "./schemas/schema";
import type { EmailPayload, Transaction } from "./types";
import { withOrg } from "./withOrg";

/**
 * Add an email to the database within an existing transaction.
 * Use this when you already have a transaction context.
 */
export async function addEmailWithTx(tx: Transaction, emailPayload: EmailPayload, userId: string, organizationId: string) {
  const to = Array.isArray(emailPayload.to) ? emailPayload.to.join(', ') : emailPayload.to;
  const cc = emailPayload.cc ? (Array.isArray(emailPayload.cc) ? emailPayload.cc.join(', ') : emailPayload.cc) : undefined;
  const bcc = emailPayload.bcc ? (Array.isArray(emailPayload.bcc) ? emailPayload.bcc.join(', ') : emailPayload.bcc) : undefined;

  await tx.insert(emails).values({
    organizationId,
    userId,
    to,
    subject: emailPayload.subject,
    body: emailPayload.html,
    text: emailPayload.text,
    from: emailPayload.from || 'noreply@example.com',
    cc,
    bcc,
    replyTo: emailPayload.replyTo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Add an email to the database, creating a new transaction with org context.
 * Use this when you don't have an existing transaction.
 */
export async function addEmail(emailPayload: EmailPayload, userId: string, organizationId: string) {
  return withOrg(organizationId, async (tx) => {
    return addEmailWithTx(tx, emailPayload, userId, organizationId);
  });
}
