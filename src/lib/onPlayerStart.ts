import { container } from "@sapphire/framework";
import { EmbedBuilder, TextChannel } from "discord.js";
import type { Player, GuildQueue, Track } from "discord-player";
import { config } from "./config";
import { BRAND_COLOR } from "../constants";

export function registerPlayerStart(player: Player): void {
  player.events.on("playerStart", async (queue: GuildQueue, track: Track) => {
    if (!config.MUSIC_CHANNEL_ID) return;

    try {
      const channel = await queue.guild.channels.fetch(config.MUSIC_CHANNEL_ID).catch(() => null);
      if (!(channel instanceof TextChannel)) return;

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("🎵 Now Playing")
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: "Duration",     value: track.duration,                                  inline: true },
          { name: "Requested by", value: track.requestedBy?.tag ?? "Unknown",              inline: true },
        )
        .setFooter({ text: "The Vertex Music" });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      container.logger.error(`[onPlayerStart] error: ${err}`);
    }
  });
}
