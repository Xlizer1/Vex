import { container } from "@sapphire/framework";
import { EmbedBuilder, TextChannel } from "discord.js";
import type { Player, GuildQueue } from "discord-player";
import { config } from "./config";
import { ERROR_COLOR } from "../constants";

export function registerPlayerError(player: Player): void {
  player.events.on("playerError", async (queue: GuildQueue, error: Error) => {
    container.logger.error(`[playerError] guild=${queue.guild.id}: ${error}`);

    if (!config.MUSIC_CHANNEL_ID) return;

    try {
      const channel = await queue.guild.channels.fetch(config.MUSIC_CHANNEL_ID).catch(() => null);
      if (!(channel instanceof TextChannel)) return;

      const embed = new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setTitle("⚠️ Player Error")
        .setDescription("An error occurred while playing. Skipping to the next track.")
        .setFooter({ text: "The Vertex Music" });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      container.logger.error(`[onPlayerError] failed to send error embed: ${err}`);
    }
  });
}
