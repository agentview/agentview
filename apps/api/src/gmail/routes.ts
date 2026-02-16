import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { authn, authorize, requireMemberId } from '../authMiddleware';
import { withOrg } from '../withOrg';
import { db__dangerous } from '../db';
import { gmailConnections } from '../schemas/schema';
import { response_data, response_error } from '../hono_utils';
import {
  createOAuth2Client,
  createOAuthState,
  verifyOAuthState,
  exchangeCodeForTokens,
  GMAIL_SCOPES,
} from './client';
import { getProfile, setupWatch, fetchNewEmails } from './api';

export const gmailApp = new OpenAPIHono();

// --- GET /api/gmail/auth ---

const gmailAuthRoute = createRoute({
  method: 'get',
  path: '/api/gmail/auth',
  summary: 'Get Gmail OAuth URL',
  tags: ['Gmail'],
  responses: {
    200: response_data(z.object({ url: z.string() })),
    401: response_error(),
  },
});

gmailApp.openapi(gmailAuthRoute, async (c) => {
  const principal = await authn(c.req.raw.headers);
  authorize(principal, { action: 'environment:write' });
  const memberId = requireMemberId(principal);

  const state = createOAuthState(principal.organizationId, memberId);
  const client = createOAuth2Client();

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state,
  });

  return c.json({ url }, 200);
});

// --- GET /api/gmail/callback ---

gmailApp.get('/api/gmail/callback', async (c) => {
  const error = c.req.query('error');
  if (error) {
    return c.html('<html><body><h2>Gmail connection was denied.</h2><p>You can close this window.</p></body></html>');
  }

  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.html('<html><body><h2>Missing parameters.</h2></body></html>', 400);
  }

  let statePayload: { organizationId: string; memberId: string };
  try {
    statePayload = verifyOAuthState(state);
  } catch {
    return c.html('<html><body><h2>Invalid or expired state. Please try again.</h2></body></html>', 400);
  }

  const { organizationId, memberId } = statePayload;

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    return c.html('<html><body><h2>Failed to obtain tokens. Please try again.</h2></body></html>', 400);
  }

  // Get email address
  const profile = await getProfile(tokens.access_token, tokens.refresh_token);

  // Setup push notifications
  const watch = await setupWatch(tokens.access_token, tokens.refresh_token);

  // Upsert gmail connection (one per org)
  await withOrg(organizationId, async (tx) => {
    await tx
      .insert(gmailConnections)
      .values({
        organizationId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        emailAddress: profile.emailAddress,
        historyId: watch.historyId,
        watchExpiresAt: watch.expiration,
        connectedBy: memberId,
      })
      .onConflictDoUpdate({
        target: gmailConnections.organizationId,
        set: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          emailAddress: profile.emailAddress,
          historyId: watch.historyId,
          watchExpiresAt: watch.expiration,
          connectedBy: memberId,
          updatedAt: new Date().toISOString(),
        },
      });
  });

  return c.html(
    '<html><body><h2>Gmail Connected!</h2><p>You can close this window.</p></body></html>',
  );
});

// --- POST /api/gmail/webhook ---

gmailApp.post('/api/gmail/webhook', async (c) => {
  // Always return 200 to avoid Pub/Sub redelivery loops
  try {
    const body = await c.req.json();

    // Decode Pub/Sub message
    const messageData = body?.message?.data;
    if (!messageData) {
      return c.json({ status: 'ok' }, 200);
    }

    const decoded = JSON.parse(Buffer.from(messageData, 'base64').toString('utf-8'));
    const { emailAddress, historyId } = decoded;

    if (!emailAddress) {
      return c.json({ status: 'ok' }, 200);
    }

    // Look up connection by email (cross-org)
    const connection = await db__dangerous.query.gmailConnections.findFirst({
      where: eq(gmailConnections.emailAddress, emailAddress),
    });

    if (!connection) {
      console.log(`[gmail webhook] No connection found for ${emailAddress}`);
      return c.json({ status: 'ok' }, 200);
    }

    if (!connection.historyId) {
      console.log(`[gmail webhook] No historyId stored for ${emailAddress}`);
      return c.json({ status: 'ok' }, 200);
    }

    // Fetch new emails
    const onTokenRefresh = async (tokens: { access_token: string; expiry_date: number | null }) => {
      await withOrg(connection.organizationId, async (tx) => {
        await tx.update(gmailConnections).set({
          accessToken: tokens.access_token,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          updatedAt: new Date().toISOString(),
        }).where(eq(gmailConnections.id, connection.id));
      });
    };

    const result = await fetchNewEmails(
      connection.accessToken,
      connection.refreshToken,
      connection.historyId,
      onTokenRefresh,
    );

    // Print emails to console
    for (const email of result.emails) {
      console.log(`[gmail] New email received:`);
      console.log(`  From: ${email.from}`);
      console.log(`  To: ${email.to}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Date: ${email.date}`);
      console.log(`  Snippet: ${email.snippet}`);
    }

    // Update historyId
    if (result.newHistoryId) {
      await withOrg(connection.organizationId, async (tx) => {
        await tx.update(gmailConnections).set({
          historyId: result.newHistoryId!,
          updatedAt: new Date().toISOString(),
        }).where(eq(gmailConnections.id, connection.id));
      });
    } else {
      // historyId too old, re-setup watch
      console.log(`[gmail webhook] History expired for ${emailAddress}, re-setting up watch`);
      const watch = await setupWatch(
        connection.accessToken,
        connection.refreshToken,
        onTokenRefresh,
      );
      await withOrg(connection.organizationId, async (tx) => {
        await tx.update(gmailConnections).set({
          historyId: watch.historyId,
          watchExpiresAt: watch.expiration,
          updatedAt: new Date().toISOString(),
        }).where(eq(gmailConnections.id, connection.id));
      });
    }
  } catch (error) {
    console.error('[gmail webhook] Error processing webhook:', error);
  }

  return c.json({ status: 'ok' }, 200);
});
