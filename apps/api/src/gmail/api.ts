import { google } from 'googleapis';
import { createOAuth2Client } from './client';

type OnTokenRefresh = (tokens: { access_token: string; expiry_date: number | null }) => Promise<void>;

function createAuthenticatedClient(
  accessToken: string,
  refreshToken: string,
  onTokenRefresh?: OnTokenRefresh,
) {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (onTokenRefresh) {
    client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await onTokenRefresh({
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date ?? null,
        });
      }
    });
  }

  return google.gmail({ version: 'v1', auth: client });
}

export async function getProfile(accessToken: string, refreshToken: string) {
  const gmail = createAuthenticatedClient(accessToken, refreshToken);
  const res = await gmail.users.getProfile({ userId: 'me' });
  return { emailAddress: res.data.emailAddress!, historyId: res.data.historyId! };
}

export async function setupWatch(
  accessToken: string,
  refreshToken: string,
  onTokenRefresh?: OnTokenRefresh,
) {
  const gmail = createAuthenticatedClient(accessToken, refreshToken, onTokenRefresh);
  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC!,
      labelIds: ['INBOX'],
    },
  });
  return {
    historyId: res.data.historyId!.toString(),
    expiration: new Date(Number(res.data.expiration!)).toISOString(),
  };
}

export async function fetchNewEmails(
  accessToken: string,
  refreshToken: string,
  startHistoryId: string,
  onTokenRefresh?: OnTokenRefresh,
) {
  const gmail = createAuthenticatedClient(accessToken, refreshToken, onTokenRefresh);

  try {
    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    });

    const histories = historyRes.data.history ?? [];
    const messageIds = new Set<string>();

    for (const h of histories) {
      for (const added of h.messagesAdded ?? []) {
        if (added.message?.id) {
          messageIds.add(added.message.id);
        }
      }
    }

    const emails: Array<{
      id: string;
      from: string;
      to: string;
      subject: string;
      date: string;
      snippet: string;
    }> = [];

    for (const msgId of messageIds) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: msgId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = msg.data.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

      emails.push({
        id: msgId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: msg.data.snippet ?? '',
      });
    }

    return {
      emails,
      newHistoryId: historyRes.data.historyId?.toString() ?? startHistoryId,
    };
  } catch (error: any) {
    // History ID too old - caller should re-setup watch
    if (error?.code === 404) {
      return { emails: [], newHistoryId: null };
    }
    throw error;
  }
}
