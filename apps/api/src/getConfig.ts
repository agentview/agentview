import { configs } from "./schemas/schema";
import { desc } from "drizzle-orm";
import type { Transaction } from "./types";

export async function getConfigRow(tx: Transaction) {
    const configRows = await tx.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0]
}
