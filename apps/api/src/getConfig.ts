import { db } from "./db";
import { configs } from "./schemas/schema";
import { desc } from "drizzle-orm";

export async function getConfigRow() {
    const configRows = await db.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0]
}
