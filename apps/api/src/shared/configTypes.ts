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

export type SessionItemSchema = Record<string, z.ZodType | string> | z.ZodObject;

export interface BaseSessionItemConfig<TScoreConfig> {
    schema: SessionItemSchema;
    resultOf?: SessionItemSchema;
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
