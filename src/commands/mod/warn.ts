import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { ModerationService } from "../../services/ModerationService";
import { replyError } from "../../lib/replyError";

export class WarnCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["AdminOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("warn")
        .setDescription("Issue a warning to a member")
        .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning").setRequired(true)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    if (!interaction.guild) return replyError(interaction, "This command can only be used in a server.");

    try {
      const infraction = await ModerationService.warn(interaction.guild, target, interaction.user, reason);
      return interaction.editReply(`Warned **${target.username}**. Case #${infraction.id}.`);
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
