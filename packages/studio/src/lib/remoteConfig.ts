import type { AgentViewConfig, SessionItemConfig } from "~/types";
import { apiFetch } from "./apiFetch";
import { makeObjectSerializable, normalizeExtendedSchema } from "./shared/configUtils";
import type { BaseAgentViewConfig, BaseScoreConfig, BaseSessionItemConfig } from "./shared/configTypes";

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

// export function studioConfigToBaseConfig(config: AgentViewConfig): BaseAgentViewConfig {
//     return {
//       agents: (config.agents ?? []).map((agent) => ({
//         name: agent.name,
//         url: agent.url,
//         metadata: agent.metadata,
//         runs: agent.runs?.map((run) => ({
//           input: getBaseSessionItem(run.input),
//           output: getBaseSessionItem(run.output),
//           steps: run.steps?.map((step) => getBaseSessionItem(step)),
//         })) ?? []
//       }))
//     }
//   }
    
//   function getBaseSessionItem(item: SessionItemConfig): BaseSessionItemConfig<BaseScoreConfig> {
//     return {
//       schema: normalizeExtendedSchema(item.schema),
//       scores: item.scores?.map((score) => ({
//         name: score.name,
//         schema: score.schema,
//       }))
//     }
//   }
  