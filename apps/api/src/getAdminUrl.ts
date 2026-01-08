export function getAdminUrl() {
    const adminUrl = process.env.AGENTVIEW_ADMIN_URL;
    if (!adminUrl) {
        throw new Error('AGENTVIEW_ADMIN_URL is not set');
    }
    return adminUrl;
}