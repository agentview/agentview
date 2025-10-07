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
                    multipleRuns: true,
                    runs: [agent.run]
                }
            }
            else {
                return agent as MultipleRunsAgentConfig;
            }
        })
    }
}

export const config = loadConfig();