export function getWebAppUrl() {
    if (!import.meta.env.VITE_AGENTVIEW_WEBAPP_URL) {
        throw new Error('VITE_AGENTVIEW_WEBAPP_URL is not set');
    }
    return import.meta.env.VITE_AGENTVIEW_WEBAPP_URL;
}