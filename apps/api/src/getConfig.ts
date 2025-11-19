import { db } from "./db";
import { configs } from "./schemas/schema";
import { desc } from "drizzle-orm";
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import type { BaseAgentViewConfig, BaseScoreConfig, BaseSessionItemConfig } from "./shared/configTypes";
import { z, ZodObject, ZodType } from "zod";

const JsonSchema = z.record(z.string(), z.any()).superRefine((value, ctx) => {
    const valid = isJSONSchema(value)
    if (!valid) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid JSON Schema format",
        });
    }
});

const JsonSchemaToZod = JsonSchema.transform((schema) => convertJsonSchemaToZod(schema))



// const ExtendedSchema = z.union([
//     JsonSchemaToZod,
//     z.record(z.string(), z.union([JsonSchemaToZod, z.string()]))
// ]);

// const BaseSessionItemConfigSchema = z.object({
//     schema: ExtendedSchema,
//     scores: z.array(z.object({
//         name: z.string(),
//         schema: JsonSchemaToZod,
//     })).optional(),
// });

// const BaseSessionItemConfigSchemaWithTools = BaseSessionItemConfigSchema.extend({
//     callResult: BaseSessionItemConfigSchema.optional(),
// });

// export const BaseConfigSchema = z.object({
//     agents: z.array(z.object({
//         name: z.string(),
//         url: z.string(),
//         metadata: z.record(z.string(), JsonSchemaToZod).optional(),
//         allowUnknownMetadata: z.boolean().optional(),
//         allowUnknownRuns: z.boolean().optional(),
//         allowUnknownSteps: z.boolean().optional(),
//         allowUnknownItemKeys: z.boolean().optional(),
//         runs: z.array(z.object({
//             input: BaseSessionItemConfigSchema,
//             output: BaseSessionItemConfigSchema,
//             steps: z.array(BaseSessionItemConfigSchemaWithTools).optional(),
//             metadata: z.record(z.string(), JsonSchemaToZod).optional(),
//             allowUnknownMetadata: z.boolean().optional(),
//         })).optional(),
//     })).optional(),
// })

function baseConfigSchema<T extends z.ZodType>(jsonSchemaSchema: T) {
    const ExtendedSchema = z.union([
        jsonSchemaSchema,
        z.record(z.string(), z.union([jsonSchemaSchema, z.string()]))
    ]);
    
    const BaseSessionItemConfigSchema = z.object({
        schema: ExtendedSchema,
        scores: z.array(z.object({
            name: z.string(),
            schema: jsonSchemaSchema,
        })).optional(),
    });
    
    const BaseSessionItemConfigSchemaWithTools = BaseSessionItemConfigSchema.extend({
        callResult: BaseSessionItemConfigSchema.optional(),
    });
    
    return z.object({
        agents: z.array(z.object({
            name: z.string(),
            url: z.string(),
            metadata: z.record(z.string(), jsonSchemaSchema).optional(),
            allowUnknownMetadata: z.boolean().optional(),
            allowUnknownRuns: z.boolean().optional(),
            allowUnknownSteps: z.boolean().optional(),
            allowUnknownItemKeys: z.boolean().optional(),
            runs: z.array(z.object({
                input: BaseSessionItemConfigSchema,
                output: BaseSessionItemConfigSchema,
                steps: z.array(BaseSessionItemConfigSchemaWithTools).optional(),
                metadata: z.record(z.string(), jsonSchemaSchema).optional(),
                allowUnknownMetadata: z.boolean().optional(),
            })).optional(),
        })).optional(),
    })
}

export const BaseConfigSchema = baseConfigSchema(JsonSchema)
export const BaseConfigSchemaToZod = baseConfigSchema(JsonSchemaToZod)


function isJSONSchema(value: any): boolean { // temporarily simple check
    return typeof value === 'object' && value !== null && '$schema' in value;
}



// function parseConfig(config: z.infer<typeof BaseConfigSchema>): BaseAgentViewConfig {
//     return BaseConfigSchemaToZod.parse(config)
// }



// function parseSessionItem(item: z.infer<typeof BaseSessionItemConfigSchema>): BaseSessionItemConfig<BaseScoreConfig> {
//     return {
//         schema: convertJsonSchemasInObject(item.schema) as ZodObject,
//         scores: item.scores?.map((score: any) => ({
//             ...score,
//             schema: convertJsonSchemasInObject(score.schema),
//         }))
//     }
// }

export async function getConfigRow() {
    const configRows = await db.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0]
}

// export async function getParsedConfig(): Promise<BaseAgentViewConfig | undefined> {
//     const configRow = await getConfigRow();
//     if (!configRow) {
//         return undefined;
//     }

//     return parseConfig(configRow.config as z.infer<typeof BaseConfigSchema>);
// }


// function isJsonSchemaObject(obj: any): boolean {
//     if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
//         return false;
//     }

//     // Check for JSON Schema indicators
//     // JSON Schema objects typically have:
//     // - "type" property (string) - most common indicator
//     // - "$schema" property (string URI)
//     // - "properties" property (object) - for object schemas
//     // - "items" property - for array schemas
//     // - "required" property (array) - for object schemas
//     return (
//         (typeof obj.type === 'string' || Array.isArray(obj.type)) ||
//         '$schema' in obj ||
//         'properties' in obj ||
//         'items' in obj ||
//         ('required' in obj && Array.isArray(obj.required))
//     );
// }

// function convertJsonSchemasInObject(value: any): any {
//     // Handle null/undefined
//     if (value === null || value === undefined) {
//         return value;
//     }

//     // Skip arrays - don't traverse them
//     if (Array.isArray(value)) {
//         return value;
//     }

//     // Handle primitives
//     if (typeof value !== 'object') {
//         return value;
//     }

//     // Check if this is a JSON Schema object
//     if (isJsonSchemaObject(value)) {
//         return convertJsonSchemaToZod(value);
//     }

//     // Recursively traverse object properties and build Zod object if any field is Zod
//     const shape: Record<string, any> = {};
//     let hasZod = false;
//     for (const [key, val] of Object.entries(value)) {
//         const converted = convertJsonSchemasInObject(val);
//         shape[key] = converted;
//         if (converted instanceof ZodType) {
//             hasZod = true;
//         }
//     }

//     if (hasZod) {
//         return z.object(shape as any);
//     }

//     return shape;
// }
