import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { config } from "./lib/config";
import { db, client as dbClient } from "./db";
import { stopVoiceFragPoller } from "./lib/voiceFragPoller";
import { initPlayer } from "./lib/player";

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

initPlayer(client);

async function shutdown() {
  client.logger.info("Shutting down...");
  stopVoiceFragPoller();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);

dbClient.unsafe("CREATE SCHEMA IF NOT EXISTS vex")
  .then(() => migrate(db, { migrationsFolder: "./drizzle" }))
  .then(() => client.login(config.DISCORD_TOKEN))
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
