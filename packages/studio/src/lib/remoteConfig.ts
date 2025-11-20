import type { AgentViewConfig, SessionItemConfig } from "~/types";
import { apiFetch } from "./apiFetch";
import { makeObjectSerializable } from "./shared/configUtils";
import type { BaseAgentViewConfig, BaseScoreConfig, BaseSessionItemConfig } from "./shared/configTypes";


// TODO: this code could use SDK

export async function getRemoteConfig() {
    const response = await apiFetch(`/api/config`);

    if (!response.ok) {
        throw response.error;
    }

    return response.data;
}

export async function updateRemoteConfig(config: AgentViewConfig) {
    const response = await apiFetch(`/api/config`, {
        method: "PUT",
        body: {
            // config: makeObjectSerializable(studioConfigToBaseConfig(config))
            config: makeObjectSerializable(config)

        }
    });

    if (!response.ok) {
        throw response.error;
    }

    return response.data;
}
