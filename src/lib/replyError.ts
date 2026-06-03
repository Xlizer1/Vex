import { EmbedBuilder, MessageFlags } from "discord.js";
import type { Command } from "@sapphire/framework";
import { ERROR_COLOR } from "../constants";

export async function replyError(
  interaction: Command.ChatInputCommandInteraction,
  message = "Something went wrong. Please try again.",
): Promise<void> {
  const embed = new EmbedBuilder().setColor(ERROR_COLOR).setDescription(message);

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  } else {
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
  }
}
