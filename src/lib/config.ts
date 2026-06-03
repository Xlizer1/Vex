const required = ["DISCORD_TOKEN", "WELCOME_CHANNEL_ID", "EDGE_ROLE_ID", "DATABASE_URL"] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

export const config = {
  DISCORD_TOKEN:            process.env.DISCORD_TOKEN!,
  WELCOME_CHANNEL_ID:       process.env.WELCOME_CHANNEL_ID!,
  EDGE_ROLE_ID:             process.env.EDGE_ROLE_ID!,
  CLIENT_ID:                process.env.CLIENT_ID,
  GUILD_ID:                 process.env.GUILD_ID,
  RANKS_CHANNEL_ID:         process.env.RANKS_CHANNEL_ID,
  MOD_LOG_CHANNEL_ID:       process.env.MOD_LOG_CHANNEL_ID,
  AUDIT_LOG_CHANNEL_ID:     process.env.AUDIT_LOG_CHANNEL_ID,
  SKIN_LISTINGS_CHANNEL_ID: process.env.SKIN_LISTINGS_CHANNEL_ID,
  DATABASE_URL:             process.env.DATABASE_URL!,
  REDIS_URL:                process.env.REDIS_URL,
  DATHOST_EMAIL:            process.env.DATHOST_EMAIL,
  DATHOST_PASSWORD:         process.env.DATHOST_PASSWORD,
  STEAM_API_KEY:            process.env.STEAM_API_KEY,
  LEETIFY_API_KEY:          process.env.LEETIFY_API_KEY,
  MUSIC_CHANNEL_ID:         process.env.MUSIC_CHANNEL_ID,
  YOUTUBE_ACCESS_TOKEN:     process.env.YOUTUBE_ACCESS_TOKEN,
  YOUTUBE_REFRESH_TOKEN:    process.env.YOUTUBE_REFRESH_TOKEN,
  YOUTUBE_TOKEN_EXPIRY:     process.env.YOUTUBE_TOKEN_EXPIRY,
};
