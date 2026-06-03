import { boolean, integer, pgSchema, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const vex = pgSchema("vex");

export const users = vex.table("users", {
  id:           varchar("id", { length: 20 }).primaryKey(),
  username:     varchar("username", { length: 32 }).notNull(),
  globalName:   varchar("global_name", { length: 32 }),
  discriminator:varchar("discriminator", { length: 4 }),
  avatarHash:   varchar("avatar_hash"),
  bannerHash:   varchar("banner_hash"),
  accentColor:  integer("accent_color"),
  bot:          boolean("bot").default(false).notNull(),
  publicFlags:  integer("public_flags"),
  nickname:     varchar("nickname", { length: 32 }),
  joinedAt:     timestamp("joined_at"),
  premiumSince: timestamp("premium_since"),
  pending:      boolean("pending").default(false).notNull(),
  steamId:          varchar("steam_id", { length: 20 }),
  frags:            integer("frags").default(100).notNull(),
  lastDailyAt:      timestamp("last_daily_at"),
  lastMessageFragAt:timestamp("last_message_frag_at"),
  isActive:         boolean("is_active").default(true).notNull(),
  leftAt:       timestamp("left_at"),
  firstSeenAt:  timestamp("first_seen_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const infractions = vex.table("infractions", {
  id:          serial("id").primaryKey(),
  userId:      varchar("user_id", { length: 20 }).notNull().references(() => users.id),
  moderatorId: varchar("moderator_id", { length: 20 }).notNull().references(() => users.id),
  type:        varchar("type", { length: 10 }).notNull(),
  reason:      text("reason").notNull(),
  duration:    integer("duration"),
  expiresAt:   timestamp("expires_at"),
  active:      boolean("active").default(true).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Infraction = typeof infractions.$inferSelect;
export type NewInfraction = typeof infractions.$inferInsert;
