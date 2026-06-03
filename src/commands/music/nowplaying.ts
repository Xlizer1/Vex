import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class NowPlayingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("nowplaying").setDescription("Show the currently playing track"),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const queue = useQueue(interaction.guildId!);
      const track = queue?.currentTrack;
      if (!track) return replyError(interaction, "Nothing is currently playing.");

      const timestamp  = queue.node.getTimestamp();
      const progressBar = queue.node.createProgressBar();

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("🎵 Now Playing")
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: "Duration",     value: `${timestamp?.current.label ?? "0:00"} / ${track.duration}`, inline: true },
          { name: "Requested by", value: track.requestedBy?.tag ?? "Unknown",                          inline: true },
        )
        .setFooter({ text: `The Vertex Music${progressBar ? ` · ${progressBar}` : ""}` });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
