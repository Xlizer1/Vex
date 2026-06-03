import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { useQueue } from "discord-player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

const MAX_SHOWN = 10;

export class QueueCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("queue").setDescription("Show the current queue"),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const queue = useQueue(interaction.guildId!);
      if (!queue?.currentTrack) return replyError(interaction, "Nothing is currently playing.");

      const current  = queue.currentTrack;
      const tracks   = queue.tracks.toArray();
      const total    = tracks.length;

      const upNextLines = tracks.slice(0, MAX_SHOWN).map((t, i) =>
        `\`${i + 1}.\` **${t.title}** — ${t.duration}`,
      );

      if (total > MAX_SHOWN) upNextLines.push(`*…and ${total - MAX_SHOWN} more tracks*`);

      const totalMs = tracks.reduce((acc, t) => acc + t.durationMS, 0);
      const totalMins = Math.floor(totalMs / 60_000);
      const totalSecs = Math.floor((totalMs % 60_000) / 1_000);
      const totalDuration = `${totalMins}:${String(totalSecs).padStart(2, "0")}`;

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("📋 Queue")
        .addFields(
          {
            name:  "🎵 Now Playing",
            value: `**[${current.title}](${current.url})** — ${current.duration}`,
          },
          {
            name:  "Up Next",
            value: upNextLines.length > 0 ? upNextLines.join("\n") : "*Queue is empty*",
          },
        )
        .setFooter({ text: `${total} tracks · ${totalDuration} remaining · The Vertex Music` });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
