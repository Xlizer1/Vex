import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { GuildMember, User } from "discord.js";
import { db } from "../db";
import { users, type User as UserRow } from "../db/schema";
import { DAILY_COOLDOWN_MS } from "../constants";

export const UserRepository = {
  async upsert(member: GuildMember): Promise<void> {
    const u = member.user;
    await db
      .insert(users)
      .values({
        id:           u.id,
        username:     u.username,
        globalName:   u.globalName ?? null,
        discriminator:u.discriminator !== "0" ? u.discriminator : null,
        avatarHash:   u.avatar ?? null,
        bannerHash:   u.banner ?? null,
        accentColor:  u.accentColor ?? null,
        bot:          u.bot,
        publicFlags:  u.flags?.bitfield ?? null,
        nickname:     member.nickname ?? null,
        joinedAt:     member.joinedAt ?? null,
        premiumSince: member.premiumSince ?? null,
        pending:      member.pending,
        isActive:     true,
        leftAt:       null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username:     u.username,
          globalName:   u.globalName ?? null,
          discriminator:u.discriminator !== "0" ? u.discriminator : null,
          avatarHash:   u.avatar ?? null,
          bannerHash:   u.banner ?? null,
          accentColor:  u.accentColor ?? null,
          publicFlags:  u.flags?.bitfield ?? null,
          nickname:     member.nickname ?? null,
          joinedAt:     member.joinedAt ?? null,
          premiumSince: member.premiumSince ?? null,
          pending:      member.pending,
          isActive:     true,
          leftAt:       null,
          updatedAt:    new Date(),
        },
      });
  },

  async upsertFromUser(user: User): Promise<void> {
    await db
      .insert(users)
      .values({
        id:           user.id,
        username:     user.username,
        globalName:   user.globalName ?? null,
        discriminator:user.discriminator !== "0" ? user.discriminator : null,
        avatarHash:   user.avatar ?? null,
        bannerHash:   user.banner ?? null,
        accentColor:  user.accentColor ?? null,
        bot:          user.bot,
        publicFlags:  user.flags?.bitfield ?? null,
        isActive:     true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username:     user.username,
          globalName:   user.globalName ?? null,
          discriminator:user.discriminator !== "0" ? user.discriminator : null,
          avatarHash:   user.avatar ?? null,
          bannerHash:   user.banner ?? null,
          accentColor:  user.accentColor ?? null,
          publicFlags:  user.flags?.bitfield ?? null,
          updatedAt:    new Date(),
        },
      });
  },

  async findById(id: string): Promise<UserRow | null> {
    return db.select().from(users).where(eq(users.id, id)).then((r) => r[0] ?? null);
  },

  async updateSteamId(id: string, steamId: string): Promise<void> {
    await db.update(users).set({ steamId, updatedAt: new Date() }).where(eq(users.id, id));
  },

  async getBalance(id: string): Promise<number> {
    const row = await db
      .select({ frags: users.frags })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);
    return row?.frags ?? 0;
  },

  async addFrags(id: string, amount: number): Promise<number> {
    const [row] = await db
      .update(users)
      .set({ frags: sql`${users.frags} + ${amount}` })
      .where(eq(users.id, id))
      .returning({ frags: users.frags });
    return row?.frags ?? 0;
  },

  // Atomic cooldown-checked award — eliminates the race condition from the old
  // check-then-update pattern. Returns true if frags were awarded.
  async awardFragsIfCooldownPassed(id: string, amount: number, cooldownMs: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - cooldownMs);
    const result = await db
      .update(users)
      .set({
        frags: sql`${users.frags} + ${amount}`,
        lastMessageFragAt: new Date(),
      })
      .where(
        and(
          eq(users.id, id),
          or(
            sql`${users.lastMessageFragAt} IS NULL`,
            lt(users.lastMessageFragAt, cutoff),
          ),
        ),
      )
      .returning({ id: users.id });
    return result.length > 0;
  },

  async batchAddFrags(ids: string[], amount: number): Promise<void> {
    if (ids.length === 0) return;
    await db
      .update(users)
      .set({ frags: sql`${users.frags} + ${amount}` })
      .where(inArray(users.id, ids));
  },

  // Atomic transfer — uses a transaction to prevent double-spend.
  async transferFrags(
    fromId: string,
    toId: string,
    amount: number,
  ): Promise<{ fromBalance: number; toBalance: number }> {
    return db.transaction(async (tx) => {
      const [from] = await tx
        .update(users)
        .set({ frags: sql`${users.frags} - ${amount}` })
        .where(and(eq(users.id, fromId), sql`${users.frags} >= ${amount}`))
        .returning({ frags: users.frags });

      if (!from) throw new Error("Insufficient frags or sender not found");

      const [to] = await tx
        .update(users)
        .set({ frags: sql`${users.frags} + ${amount}` })
        .where(eq(users.id, toId))
        .returning({ frags: users.frags });

      return { fromBalance: from.frags, toBalance: to?.frags ?? amount };
    });
  },

  // Atomic flip resolution — deducts from loser, awards to winner in one transaction.
  async flipFrags(
    winnerId: string,
    loserId: string,
    amount: number,
  ): Promise<{ winnerBalance: number }> {
    return db.transaction(async (tx) => {
      const [loser] = await tx
        .update(users)
        .set({ frags: sql`${users.frags} - ${amount}` })
        .where(and(eq(users.id, loserId), sql`${users.frags} >= ${amount}`))
        .returning({ frags: users.frags });

      if (!loser) throw new Error("Insufficient frags or loser not found");

      const [winner] = await tx
        .update(users)
        .set({ frags: sql`${users.frags} + ${amount}` })
        .where(eq(users.id, winnerId))
        .returning({ frags: users.frags });

      return { winnerBalance: winner?.frags ?? 0 };
    });
  },

  async claimDaily(
    id: string,
    amount: number,
  ): Promise<{ alreadyClaimed: false; newBalance: number } | { alreadyClaimed: true; remainingMs: number }> {
    const cutoff = new Date(Date.now() - DAILY_COOLDOWN_MS);

    const [updated] = await db
      .update(users)
      .set({
        frags: sql`${users.frags} + ${amount}`,
        lastDailyAt: new Date(),
      })
      .where(
        and(
          eq(users.id, id),
          or(
            sql`${users.lastDailyAt} IS NULL`,
            lt(users.lastDailyAt, cutoff),
          ),
        ),
      )
      .returning({ frags: users.frags });

    if (updated) return { alreadyClaimed: false, newBalance: updated.frags };

    const row = await db
      .select({ lastDailyAt: users.lastDailyAt })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    const remainingMs = row?.lastDailyAt
      ? DAILY_COOLDOWN_MS - (Date.now() - row.lastDailyAt.getTime())
      : 0;

    return { alreadyClaimed: true, remainingMs: Math.max(0, remainingMs) };
  },

  async setInactive(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, leftAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  },
};
