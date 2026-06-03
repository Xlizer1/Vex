import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { FragService } from "../../services/FragService";
import { InsufficientFragsError } from "../../errors";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class GiveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("give")
        .setDescription("Transfer frags to another member")
        .addUserOption((o) =>
          o.setName("user").setDescription("Member to send frags to").setRequired(true),
        )
        .addIntegerOption((o) =>
          o.setName("amount").setDescription("Amount of frags to give").setRequired(true).setMinValue(1),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.id === interaction.user.id) return replyError(interaction, "You can't give frags to yourself.");
    if (target.bot) return replyError(interaction, "You can't give frags to a bot.");

    try {
      const { fromBalance } = await FragService.transfer(interaction.user.id, target.id, amount);

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setDescription(
          `Sent **${amount.toLocaleString()} frags** to **${target.displayName}** 💰\nYour new balance: **${fromBalance.toLocaleString()} frags**`,
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err instanceof InsufficientFragsError) {
        return replyError(
          interaction,
          `You only have **${err.balance.toLocaleString()} frags** — not enough to send **${amount.toLocaleString()}**.`,
        );
      }
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
