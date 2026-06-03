import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { useQueue } from "discord-player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class SkipCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("skip").setDescription("Skip the current track"),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const queue = useQueue(interaction.guildId!);
      if (!queue?.node.isPlaying()) return replyError(interaction, "Nothing is currently playing.");

      const skipped = queue.currentTrack;
      queue.node.skip();

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription(`⏭ Skipped **${skipped?.title ?? "current track"}**.`)
        .setFooter({ text: "The Vertex Music" });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
