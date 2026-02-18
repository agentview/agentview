const API_URL = import.meta.env.VITE_AGENTVIEW_API_URL;

export async function apiRequest<T>(
  orgId: string,
  method: string,
  path: string,
  body?: any,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-organization-id': orgId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw { statusCode: response.status, message: errorBody.message ?? 'Unknown error' };
  }

  return await response.json();
}
