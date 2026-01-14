import type { AgentConfig, AgentViewConfig } from "agentview/types";
import { like } from "./scores";

export function loadConfig(): AgentViewConfig {
    const config: AgentViewConfig | undefined = (window as any).agentview?.config;
    if (!config) {
        throw new Error("Config not found");
    }

    return {
        ...config,
        agents: config.agents?.map((agent) => {
            return {
                ...agent,
                runs: agent.runs?.map((run) => {
                    const outputScores = [...(run.output.scores ?? [])];
                    if (!run.output.disableLike) {
                        outputScores.unshift(like());
                    }
                    return { ...run, output: { ...run.output, scores: outputScores } }
                })
            }
        })
    }
}

export const config = loadConfig();