import { z } from "zod";

export const BaseSessionItemConfigSchema = z.object({
    schema: z.any(),
    resultOf: z.any().optional(),
    scores: z.array(z.object({
        name: z.string(),
        schema: z.any(),
    })).optional(),
});

export const BaseConfigSchema = z.object({
    agents: z.array(z.object({
        name: z.string(),
        url: z.string(),
        metadata: z.any().optional(),
        allowUnknownMetadata: z.boolean().optional(),
        runs: z.array(z.object({
            input: BaseSessionItemConfigSchema,
            output: BaseSessionItemConfigSchema,
            steps: z.array(BaseSessionItemConfigSchema).nullable(),
        })).optional(),
    })).optional(),
})

export interface BaseScoreConfig {
    name: string;
    schema: z.ZodType;
}

export type ExtendedSchema = Record<string, z.ZodType | string> | z.ZodObject;

export interface BaseSessionItemConfig<TScoreConfig extends BaseScoreConfig = BaseScoreConfig> {
    schema: ExtendedSchema;
    scores?: TScoreConfig[];
    callResult?: BaseSessionItemConfig<TScoreConfig>;
}

export interface BaseRunConfig<TSessionItemConfig extends BaseSessionItemConfig = BaseSessionItemConfig, TSessionInputItemConfig extends BaseSessionItemConfig = BaseSessionItemConfig> {
    input: TSessionInputItemConfig;
    output: TSessionItemConfig;
    steps?: TSessionItemConfig[];
}

export interface BaseAgentConfig<TRunConfig extends BaseRunConfig = BaseRunConfig> {
    name: string;
    url: string;
    metadata?: ExtendedSchema;
    allowUnknownMetadata?: boolean;
    runs?: TRunConfig[];
}

export type BaseAgentViewConfig<TAgentConfig extends BaseAgentConfig = BaseAgentConfig> = {
    agents?: TAgentConfig[],
}
