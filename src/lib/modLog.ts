import { container } from "@sapphire/framework";
import { EmbedBuilder, type Guild, type User } from "discord.js";
import { config } from "./config";
import { type Infraction } from "../db/schema";
import { formatDuration } from "./parseDuration";
import { sendAuditLog } from "./auditLog";
import { BRAND_COLOR, ERROR_COLOR, UNIX_SECOND_MS } from "../constants";

const TYPE_COLORS: Record<string, number> = {
  warn: BRAND_COLOR,
  mute: BRAND_COLOR,
  kick: ERROR_COLOR,
  ban:  ERROR_COLOR,
};

const TYPE_LABELS: Record<string, string> = {
  warn: "Warn",
  mute: "Mute",
  kick: "Kick",
  ban:  "Ban",
};

export async function sendModLog(
  guild: Guild,
  infraction: Infraction,
  target: User,
  moderator: User,
): Promise<void> {
  if (!config.MOD_LOG_CHANNEL_ID) return;

  const channel = await guild.channels.fetch(config.MOD_LOG_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(TYPE_COLORS[infraction.type] ?? BRAND_COLOR)
    .setTitle(`${TYPE_LABELS[infraction.type] ?? infraction.type} — Case #${infraction.id}`)
    .addFields(
      { name: "User",      value: `${target.tag} (${target.id})`,     inline: true },
      { name: "Moderator", value: `${moderator.tag} (${moderator.id})`, inline: true },
      { name: "Reason",    value: infraction.reason },
    )
    .setTimestamp(infraction.createdAt);

  if (infraction.duration) {
    embed.addFields({ name: "Duration", value: formatDuration(infraction.duration), inline: true });
  }
  if (infraction.expiresAt) {
    const ts = Math.floor(infraction.expiresAt.getTime() / UNIX_SECOND_MS);
    embed.addFields({ name: "Expires", value: `<t:${ts}:R>`, inline: true });
  }

  await channel.send({ embeds: [embed] }).catch((err) =>
    container.logger.warn(`Failed to send mod log: ${err}`),
  );
  await sendAuditLog(guild, embed);
}
