import { db } from "./db";
import { configs } from "./schemas/schema";
import { desc } from "drizzle-orm";
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { z } from "zod";

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


export async function getConfigRow() {
    const configRows = await db.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0]
}
