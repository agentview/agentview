import { getStudioURL } from "./getStudioURL";

export function getAllowedOrigin(headers: Headers) {
    const origin = headers.get('origin');
    if (!origin) return;

    // allow requests from the webapp
    if (origin === process.env.VITE_AGENTVIEW_WEBAPP_URL) return origin;

    // allow requests from localhost
    const url = new URL(origin);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.localhost');
    if (isLocalhost) return origin;

    // allow requests from the studio
    const organizationId = headers.get('x-organization-id');
    if (organizationId) {
        const studioUrl = getStudioURL(organizationId);
        if (origin === studioUrl) return origin;
    }

    return;
}