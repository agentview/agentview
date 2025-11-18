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
            context: agent.context ? convertJsonSchemaToZod(agent.context) : undefined,
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
        schema: convertJsonSchemaToZod(item.schema) as ZodObject,
        scores: item.scores?.map((score: any) => ({
            ...score,
            schema: convertJsonSchemaToZod(score.schema),
        }))
    }
}

export async function getConfigRow() {
  const configRows = await db.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
  if (configRows.length === 0) {
    return undefined;
  }

  const configRow = configRows[0]

  return {
    ...configRow,
    config: parseConfig(configRow.config as z.infer<typeof BaseConfigSchema>)
  }
}