import { z } from "zod";

export interface BaseScoreConfig {
    name: string;
    schema: z.ZodType;
}

export type Metadata = Record<string, z.ZodType>;
// export type ExtendedSchema = Record<string, z.ZodType | string> | z.ZodType;

export interface BaseSessionItemConfig<TScoreConfig extends BaseScoreConfig = BaseScoreConfig> {
    schema: z.ZodType;
    scores?: TScoreConfig[];
    callResult?: BaseSessionItemConfig<TScoreConfig>;
}

export interface BaseRunConfig<TSessionItemConfig extends BaseSessionItemConfig = BaseSessionItemConfig, TSessionInputItemConfig extends BaseSessionItemConfig = BaseSessionItemConfig> {
    input: TSessionInputItemConfig;
    output: TSessionItemConfig;
    steps?: TSessionItemConfig[];
    metadata?: Metadata;
    allowUnknownMetadata?: boolean;
}

export interface BaseAgentConfig<TRunConfig extends BaseRunConfig = BaseRunConfig> {
    name: string;
    url: string;
    metadata?: Metadata;
    allowUnknownMetadata?: boolean;
    runs?: TRunConfig[];
    allowUnknownRuns?: boolean;
    allowUnknownSteps?: boolean;
    allowUnknownItemKeys?: boolean;
}

export type BaseAgentViewConfig<TAgentConfig extends BaseAgentConfig = BaseAgentConfig> = {
    agents?: TAgentConfig[],
}
