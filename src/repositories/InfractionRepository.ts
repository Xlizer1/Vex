import { count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { infractions, type Infraction, type NewInfraction } from "../db/schema";
import { INFRACTIONS_PAGE_SIZE } from "../constants";

export const InfractionRepository = {
  async create(data: NewInfraction): Promise<Infraction> {
    const [row] = await db.insert(infractions).values(data).returning();
    if (!row) throw new Error("Failed to create infraction");
    return row;
  },

  async findByUser(
    userId: string,
    page: number,
  ): Promise<{ records: Infraction[]; total: number }> {
    const offset = (page - 1) * INFRACTIONS_PAGE_SIZE;

    const [records, [totalRow]] = await Promise.all([
      db
        .select()
        .from(infractions)
        .where(eq(infractions.userId, userId))
        .orderBy(desc(infractions.createdAt))
        .limit(INFRACTIONS_PAGE_SIZE)
        .offset(offset),
      db
        .select({ count: count() })
        .from(infractions)
        .where(eq(infractions.userId, userId)),
    ]);

    return { records, total: totalRow?.count ?? 0 };
  },
};
