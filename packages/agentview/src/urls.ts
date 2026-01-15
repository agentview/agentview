export const PRODUCTION_API_URL = 'https://api.agentview.app';
export const PRODUCTION_WEBAPP_URL = 'https://agentview.app';

/**
 * Get API URL - works in both Vite (browser) and Node.js environments.
 * Falls back to production URL if env var not set.
 */
export function getApiUrl(): string {
  // Vite/browser: import.meta.env is populated at build time
  // @ts-ignore - import.meta.env only exists in Vite environments
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGENTVIEW_API_URL) {
    // @ts-ignore
    return import.meta.env.VITE_AGENTVIEW_API_URL;
  }
  // Node.js: use process.env
  if (typeof process !== 'undefined' && process.env?.VITE_AGENTVIEW_API_URL) {
    return process.env.VITE_AGENTVIEW_API_URL;
  }
  return PRODUCTION_API_URL;
}

/**
 * Get WebApp URL - works in both Vite (browser) and Node.js environments.
 * Falls back to production URL if env var not set.
 */
export function getWebAppUrl(): string {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGENTVIEW_WEBAPP_URL) {
    // @ts-ignore
    return import.meta.env.VITE_AGENTVIEW_WEBAPP_URL;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_AGENTVIEW_WEBAPP_URL) {
    return process.env.VITE_AGENTVIEW_WEBAPP_URL;
  }
  return PRODUCTION_WEBAPP_URL;
}
