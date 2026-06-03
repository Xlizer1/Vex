import { Client, GatewayIntentBits } from "discord.js";
import { UserRepository } from "../src/repositories/UserRepository";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once("ready", async () => {
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const members = await guild.members.fetch();

  console.log(`Syncing ${members.size} members...`);

  let synced = 0;
  for (const [, member] of members) {
    await UserRepository.upsert(member);
    synced++;
    process.stdout.write(`\r${synced}/${members.size}`);
  }

  console.log("\nDone.");
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
