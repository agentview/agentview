export function getEnv() {
    if (!import.meta.env.VITE_AGENTVIEW_ENV) {
        return "dev";
    }

    if (import.meta.env.VITE_AGENTVIEW_ENV !== "dev" && import.meta.env.VITE_AGENTVIEW_ENV !== "prod") {
        throw new Error('VITE_AGENTVIEW_ENV must be either "dev" or "prod"');
    }

    return import.meta.env.VITE_AGENTVIEW_ENV;
}