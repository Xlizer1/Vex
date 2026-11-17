import { container } from "@sapphire/framework";
import type { EmbedBuilder, Guild } from "discord.js";
import { LOG_CHANNELS, STAFF_CATEGORY, type LogKind } from "./serverLayout";

export async function sendLog(guild: Guild, kind: LogKind, embed: EmbedBuilder): Promise<void> {
  const name = LOG_CHANNELS[kind];
  const channel = guild.channels.cache.find(
    (c) => c.name === name && c.parent?.name.toLowerCase() === STAFF_CATEGORY.toLowerCase(),
  );
  if (!channel?.isSendable()) {
    container.logger.warn(`Log channel #${name} not found in "${STAFF_CATEGORY}" — run /setup-server`);
    return;
  }
  await channel.send({ embeds: [embed] }).catch((err) =>
    container.logger.warn(`Failed to send ${kind} log: ${err}`),
  );
}
