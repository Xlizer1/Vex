import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { useQueue } from "discord-player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class ResumeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("resume").setDescription("Resume paused playback"),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const queue = useQueue(interaction.guildId!);
      if (!queue?.node.isPaused()) return replyError(interaction, "Nothing is currently paused.");

      queue.node.resume();

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription("▶️ Resumed.")
        .setFooter({ text: "The Vertex Music" });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
