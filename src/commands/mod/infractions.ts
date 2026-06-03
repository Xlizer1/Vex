import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { ModerationService } from "../../services/ModerationService";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR, UNIX_SECOND_MS } from "../../constants";

const TYPE_EMOJI: Record<string, string> = {
  warn: "⚠️",
  mute: "🔇",
  kick: "👢",
  ban:  "🔨",
};

export class InfractionsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["AdminOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("infractions")
        .setDescription("View infraction history for a user")
        .addUserOption((o) => o.setName("user").setDescription("User to look up").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("page").setDescription("Page number").setMinValue(1).setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getUser("user", true);
    const page   = interaction.options.getInteger("page") ?? 1;

    try {
      const { records, total, totalPages } = await ModerationService.getInfractions(target.id, page);

      if (records.length === 0) {
        return interaction.editReply(
          page > 1
            ? `Page ${page} doesn't exist — only ${totalPages} page(s) of infractions for ${target.username}.`
            : `No infractions found for **${target.username}**.`,
        );
      }

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`Infractions — ${target.username}`)
        .setDescription(`${total} total · Page ${page}/${totalPages}`)
        .setThumbnail(target.displayAvatarURL());

      for (const inf of records) {
        const emoji = TYPE_EMOJI[inf.type] ?? "•";
        const ts    = Math.floor(inf.createdAt.getTime() / UNIX_SECOND_MS);
        embed.addFields({
          name:  `${emoji} Case #${inf.id} — ${inf.type.toUpperCase()}`,
          value: `**Reason:** ${inf.reason}\n**Moderator:** <@${inf.moderatorId}>\n**Date:** <t:${ts}:D>`,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
