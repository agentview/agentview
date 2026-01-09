export function getWebAppUrl() {
    if (!process.env.VITE_AGENTVIEW_WEBAPP_URL) {
        throw new Error('VITE_AGENTVIEW_WEBAPP_URL is not set');
    }
    return process.env.VITE_AGENTVIEW_WEBAPP_URL;
}