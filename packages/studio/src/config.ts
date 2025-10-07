import type { AgentViewConfig, AgentViewConfigInternal, MultipleRunsAgentConfig, SingleRunAgentConfig } from "~/types";

export function loadConfig(): AgentViewConfigInternal {
    const config: AgentViewConfig | undefined = (window as any).agentview?.config;
    if (!config) {
        throw new Error("Config not found");
    }
    return {
        ...config,
        agents: config.agents?.map((agent) => {
            if (agent.multipleRuns === false || agent.multipleRuns === undefined) {
                return {
                    ...agent,
                    runs: [agent.run]
                }
            }
            return agent
        })
    }
}

function toMultipleRunsAgentConfig(agent: SingleRunAgentConfig): MultipleRunsAgentConfig {
    return {
        ...agent,
        multipleRuns: true,
        runs: [agent.run]
    }
}

export const config = loadConfig();