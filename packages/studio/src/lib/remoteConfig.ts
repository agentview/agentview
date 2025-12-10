import type { AgentViewConfig } from "agentview/types";
import { apiFetch } from "./apiFetch";
import { serializeConfig } from "agentview/configUtils";


// TODO: this code could use SDK

export async function getRemoteConfig() {
    const response = await apiFetch(`/api/config`);

    if (!response.ok) {
        throw response.error;
    }

    return response.data;
}

export async function updateRemoteConfig(config: AgentViewConfig) {
    const baseConfig = serializeConfig(config);
    
    const response = await apiFetch(`/api/config`, {
        method: "PUT",
        body: {
            config: baseConfig
        }
    });

    if (!response.ok) {
        throw response.error;
    }

    return response.data;
}
