import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
} from "discord.js";
import { ANTISPAM_BUTTON_PREFIX } from "../lib/antiSpam";
import { ModerationService } from "../services/ModerationService";

export class AntiSpamButtonHandler extends InteractionHandler {
  public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(ANTISPAM_BUTTON_PREFIX)) return this.none();
    const [action, userId] = interaction.customId.slice(ANTISPAM_BUTTON_PREFIX.length).split(":");
    if ((action !== "release" && action !== "ban") || !userId) return this.none();
    return this.some({ action, userId });
  }

  public override async run(interaction: ButtonInteraction, { action, userId }: { action: "release" | "ban"; userId: string }) {
    const guild = interaction.guild;
    if (!guild) return;

    const needed = action === "ban" ? PermissionFlagsBits.BanMembers : PermissionFlagsBits.ModerateMembers;
    if (!interaction.memberPermissions?.has(needed)) {
      return interaction.reply({ content: "You don't have permission to do that.", flags: MessageFlags.Ephemeral });
    }

    try {
      let outcome: string;
      if (action === "release") {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.reply({ content: "That member is no longer in the server.", flags: MessageFlags.Ephemeral });
        await member.timeout(null, `Released by ${interaction.user.tag} (anti-spam)`);
        outcome = `Released by ${interaction.user}`;
      } else {
        const user = await this.container.client.users.fetch(userId);
        const infraction = await ModerationService.ban(guild, user, interaction.user, "Compromised account spamming (anti-spam)");
        outcome = `Banned by ${interaction.user} — Case #${infraction.id}`;
      }

      const embed = EmbedBuilder.from(interaction.message.embeds[0]!).addFields({ name: "Resolved", value: outcome });
      const row   = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`${ANTISPAM_BUTTON_PREFIX}release:${userId}`).setLabel("Release").setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId(`${ANTISPAM_BUTTON_PREFIX}ban:${userId}`).setLabel("Ban").setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      return interaction.update({ embeds: [embed], components: [row] });
    } catch (err) {
      this.container.logger.error(err);
      return interaction.reply({ content: "Something went wrong. Please try again.", flags: MessageFlags.Ephemeral });
    }
  }
}
