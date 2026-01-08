export function getAdminUrl() {
    if (!import.meta.env.VITE_AGENTVIEW_ADMIN_URL) {
        throw new Error('VITE_AGENTVIEW_ADMIN_URL is not set');
    }
    return import.meta.env.VITE_AGENTVIEW_ADMIN_URL;
}