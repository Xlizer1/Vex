import { container } from "@sapphire/framework";
import type { EmbedBuilder, Guild } from "discord.js";
import { config } from "./config";

export async function sendAuditLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
  if (!config.AUDIT_LOG_CHANNEL_ID) return;
  const channel = await guild.channels.fetch(config.AUDIT_LOG_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.send({ embeds: [embed] }).catch((err) =>
    container.logger.warn(`Failed to send audit log: ${err}`),
  );
}
