import { db } from "./db";
import { configs } from "./schemas/schema";
import { desc } from "drizzle-orm";
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import type { BaseAgentViewConfig, BaseConfigSchema, BaseScoreConfig, BaseSessionItemConfig, BaseSessionItemConfigSchema } from "./shared/configTypes";
import { z, ZodObject } from "zod";


function parseConfig(config: z.infer<typeof BaseConfigSchema>): BaseAgentViewConfig {
    return {
        agents: config.agents?.map(agent => ({
            name: agent.name,
            url: agent.url,
            metadata: agent.metadata ? convertJsonSchemasInObject(agent.metadata) : undefined,
            allowUnknownMetadata: agent.allowUnknownMetadata ?? true,
            runs: agent.runs?.map((item) => ({
                input: parseSessionItem(item.input),
                output: parseSessionItem(item.output),
                steps: item.steps?.map(parseSessionItem),
            }))
        }))
    }
}

function parseSessionItem(item: z.infer<typeof BaseSessionItemConfigSchema>): BaseSessionItemConfig<BaseScoreConfig> {
    return {
        schema: convertJsonSchemasInObject(item.schema) as ZodObject,
        scores: item.scores?.map((score: any) => ({
            ...score,
            schema: convertJsonSchemasInObject(score.schema),
        }))
    }
}

export async function getConfigRow() {
    const configRows = await db.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0]
}

export async function getParsedConfig(): Promise<BaseAgentViewConfig | undefined> {
    const configRow = await getConfigRow();
    if (!configRow) {
        return undefined;
    }

    return parseConfig(configRow.config as z.infer<typeof BaseConfigSchema>);
}


function isJsonSchemaObject(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return false;
    }

    // Check for JSON Schema indicators
    // JSON Schema objects typically have:
    // - "type" property (string) - most common indicator
    // - "$schema" property (string URI)
    // - "properties" property (object) - for object schemas
    // - "items" property - for array schemas
    // - "required" property (array) - for object schemas
    return (
        'type' in obj ||
        '$schema' in obj ||
        'properties' in obj ||
        'items' in obj ||
        ('required' in obj && Array.isArray(obj.required))
    );
}

function convertJsonSchemasInObject(value: any): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return value;
    }

    // Skip arrays - don't traverse them
    if (Array.isArray(value)) {
        return value;
    }

    // Handle primitives
    if (typeof value !== 'object') {
        return value;
    }

    // Check if this is a JSON Schema object
    if (isJsonSchemaObject(value)) {
        return convertJsonSchemaToZod(value);
    }

    // Recursively traverse object properties
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
        result[key] = convertJsonSchemasInObject(val);
    }
    return result;
}