import type { AgentConfig, AgentViewConfig } from "agentview/types";

export function loadConfig(): AgentViewConfig {
    const config: AgentViewConfig | undefined = (window as any).agentview?.config;
    if (!config) {
        throw new Error("Config not found");
    }
    return {
        ...config,
        agents: config.agents?.map((agent) => {
            if (!agent.runs && !agent.run) {
                throw new Error("Agent config must have either runs or run");
            }

            if (!agent.runs && agent.run) {
                return {
                    ...agent,
                    multipleRuns: true,
                    runs: [agent.run]
                }
            }
            else {
                return agent as AgentConfig;
            }
        })
    }
}

export const config = loadConfig();