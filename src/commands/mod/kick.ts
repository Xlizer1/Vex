import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { ModerationService } from "../../services/ModerationService";
import { replyError } from "../../lib/replyError";

export class KickCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["AdminOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("kick")
        .setDescription("Kick a member from the server")
        .addUserOption((o) => o.setName("user").setDescription("Member to kick").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick").setRequired(true)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    if (!interaction.guild) return replyError(interaction, "This command can only be used in a server.");

    try {
      const member     = await interaction.guild.members.fetch(target.id);
      const infraction = await ModerationService.kick(interaction.guild, target, member, interaction.user, reason);
      return interaction.editReply(`Kicked **${target.username}**. Case #${infraction.id}.`);
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
