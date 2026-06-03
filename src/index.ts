import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import { config } from "./lib/config";
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

client.login(config.DISCORD_TOKEN).catch((err) => {
  console.error("Failed to log in:", err);
  process.exit(1);
});
