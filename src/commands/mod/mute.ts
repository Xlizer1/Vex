import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { ModerationService } from "../../services/ModerationService";
import { replyError } from "../../lib/replyError";
import { parseDuration, formatDuration } from "../../lib/parseDuration";
import { MAX_TIMEOUT_DAYS } from "../../constants";

export class MuteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["AdminOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("mute")
        .setDescription("Timeout a member")
        .addUserOption((o) => o.setName("user").setDescription("Member to mute").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("duration")
            .setDescription(`Duration e.g. 30m, 2h, 1d (max ${MAX_TIMEOUT_DAYS}d)`)
            .setRequired(true),
        )
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the mute").setRequired(true)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target      = interaction.options.getUser("user", true);
    const durationStr = interaction.options.getString("duration", true);
    const reason      = interaction.options.getString("reason", true);

    if (!interaction.guild) return replyError(interaction, "This command can only be used in a server.");

    const minutes = parseDuration(durationStr);
    if (!minutes) return replyError(interaction, "Invalid duration. Use formats like `30m`, `2h`, `1d`, `1w`.");

    const maxMinutes = MAX_TIMEOUT_DAYS * 24 * 60;
    if (minutes > maxMinutes) {
      return replyError(interaction, `Maximum timeout is ${MAX_TIMEOUT_DAYS} days.`);
    }

    try {
      const member = await interaction.guild.members.fetch(target.id);
      const infraction = await ModerationService.mute(
        interaction.guild, target, member, interaction.user, durationStr, reason,
      );
      return interaction.editReply(
        `Muted **${target.username}** for ${formatDuration(minutes)}. Case #${infraction.id}.`,
      );
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
