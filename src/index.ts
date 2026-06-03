import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { sql } from "drizzle-orm";
import { config } from "./lib/config";
import { db } from "./db";
import { stopVoiceFragPoller } from "./lib/voiceFragPoller";

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  loadMessageCommandListeners: true,
});

client.on("error", (err) => client.logger.error(`Client error: ${err}`));

async function shutdown() {
  client.logger.info("Shutting down...");
  stopVoiceFragPoller();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);

db.execute(sql`CREATE SCHEMA IF NOT EXISTS vex`)
  .then(() => migrate(db, { migrationsFolder: "./drizzle" }))
  .then(() => client.login(config.DISCORD_TOKEN))
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
