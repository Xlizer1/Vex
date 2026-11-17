import { container } from "@sapphire/framework";
import type { EmbedBuilder, Guild, GuildBasedChannel, MessageCreateOptions } from "discord.js";
import { LOG_CHANNELS, STAFF_CATEGORY, type LogKind } from "./serverLayout";

export function findLogChannel(guild: Guild, kind: LogKind): GuildBasedChannel | undefined {
  const name = LOG_CHANNELS[kind];
  return guild.channels.cache.find(
    (c) => c.name === name && c.parent?.name.toLowerCase() === STAFF_CATEGORY.toLowerCase(),
  );
}

export async function sendLog(guild: Guild, kind: LogKind, payload: EmbedBuilder | MessageCreateOptions): Promise<void> {
  const channel = findLogChannel(guild, kind);
  if (!channel?.isSendable()) {
    container.logger.warn(`Log channel #${LOG_CHANNELS[kind]} not found in "${STAFF_CATEGORY}" — run /setup-server`);
    return;
  }
  const options = "toJSON" in payload ? { embeds: [payload] } : payload;
  await channel.send(options).catch((err) =>
    container.logger.warn(`Failed to send ${kind} log: ${err}`),
  );
}
