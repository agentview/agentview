import { z } from "zod";

export const BaseSessionItemConfigSchema = z.object({
    schema: z.any(),
    scores: z.array(z.object({
        name: z.string(),
        schema: z.any(),
    })).optional(),
})

export const BaseConfigSchema = z.object({
    agents: z.array(z.object({
        name: z.string(),
        url: z.string(),
        context: z.any().nullable(),
        runs: z.array(z.object({
            input: BaseSessionItemConfigSchema,
            output: BaseSessionItemConfigSchema,
            steps: z.array(BaseSessionItemConfigSchema).nullable(),
        })),
    })).optional(),
})

export interface BaseScoreConfig {
    name: string;
    schema: z.ZodType;
    options?: any
}

export interface BaseSessionItemConfig<TScoreConfig> {
    schema: Record<string, z.ZodType | string> | z.ZodObject;
    scores?: TScoreConfig[];
}

export interface BaseRunConfig<TSessionItemConfig, TSessionInputItemConfig> {
    input: TSessionInputItemConfig;
    output: TSessionItemConfig;
    steps?: TSessionItemConfig[];
}

export interface BaseAgentConfig<TRunConfig> {
    name: string;
    url: string;
    context?: z.ZodTypeAny;
    runs: TRunConfig[];
}

export type BaseConfig = {
    agents?: BaseAgentConfig<BaseRunConfig<BaseSessionItemConfig<BaseScoreConfig>, BaseSessionItemConfig<BaseScoreConfig>>>[],
}
