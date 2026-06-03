import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { useQueue } from "discord-player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class PauseCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("pause").setDescription("Pause the current track"),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const queue = useQueue(interaction.guildId!);
      if (!queue?.node.isPlaying()) return replyError(interaction, "Nothing is currently playing.");

      queue.node.pause();

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription("⏸ Paused.")
        .setFooter({ text: "The Vertex Music" });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
