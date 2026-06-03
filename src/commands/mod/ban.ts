import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { ModerationService } from "../../services/ModerationService";
import { replyError } from "../../lib/replyError";
import { parseDuration, formatDuration } from "../../lib/parseDuration";
import { MAX_TIMEOUT_DAYS } from "../../constants";

export class BanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["AdminOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("ban")
        .setDescription("Ban a member from the server")
        .addUserOption((o) => o.setName("user").setDescription("Member to ban").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("duration")
            .setDescription(`Duration e.g. 7d, 1w (omit for permanent, max ${MAX_TIMEOUT_DAYS}d)`)
            .setRequired(false),
        )
        .addIntegerOption((o) =>
          o
            .setName("delete_days")
            .setDescription("Days of messages to delete (0–7, default 0)")
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target      = interaction.options.getUser("user", true);
    const reason      = interaction.options.getString("reason", true);
    const durationStr = interaction.options.getString("duration");
    const deleteDays  = interaction.options.getInteger("delete_days") ?? 0;

    if (!interaction.guild) return replyError(interaction, "This command can only be used in a server.");

    if (durationStr) {
      const minutes = parseDuration(durationStr);
      if (!minutes) return replyError(interaction, "Invalid duration. Use formats like `7d`, `1w`.");
    }

    try {
      const infraction = await ModerationService.ban(
        interaction.guild, target, interaction.user, reason, durationStr, deleteDays,
      );

      const durationLabel = durationStr
        ? ` for ${formatDuration(parseDuration(durationStr)!)}`
        : " permanently";

      return interaction.editReply(`Banned **${target.username}**${durationLabel}. Case #${infraction.id}.`);
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
