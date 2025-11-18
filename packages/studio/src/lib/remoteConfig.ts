import type { AgentViewConfig } from "~/types";
import { apiFetch } from "./apiFetch";
import { serializeBaseConfig } from "./baseConfigHelpers";
import { getBaseConfig } from "./baseConfigHelpers";

export async function getRemoteConfig() {
    const response = await apiFetch(`/api/config`);

    if (!response.ok) {
        throw response.error;
    }

    return response.data;
}

export async function updateRemoteConfig(config: AgentViewConfig) {
    const response = await apiFetch(`/api/config`, {
        method: "POST",
        body: {
            config: serializeBaseConfig(getBaseConfig(config))
        }
    });

    if (!response.ok) {
        throw response.error;
    }

    return response.data;
}