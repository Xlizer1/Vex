import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { useQueue } from "discord-player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class StopCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("stop").setDescription("Stop playback and clear the queue"),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const queue = useQueue(interaction.guildId!);
      if (!queue) return replyError(interaction, "Nothing is currently playing.");

      // stop() clears the queue and stops playback.
      // Never call queue.delete() or any disconnect method — bot stays in channel (24/7 mode).
      queue.node.stop();

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription("⏹ Stopped and queue cleared.")
        .setFooter({ text: "The Vertex Music" });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
