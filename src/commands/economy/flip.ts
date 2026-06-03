import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import { FragService } from "../../services/FragService";
import { InsufficientFragsError } from "../../errors";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR, ERROR_COLOR, FLIP_CHALLENGE_TTL_MS } from "../../constants";

export class FlipCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("flip")
        .setDescription("Flip a coin — solo bet or challenge another member")
        .addIntegerOption((o) =>
          o.setName("amount").setDescription("Frags to wager").setRequired(true).setMinValue(1),
        )
        .addUserOption((o) =>
          o.setName("user").setDescription("Challenge a member (omit for solo flip)").setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger("amount", true);
    const target = interaction.options.getUser("user");

    // ── Solo mode ──────────────────────────────────────────────
    if (!target) {
      await interaction.deferReply();
      try {
        const { won, newBalance } = await FragService.soloFlip(interaction.user.id, amount);

        const embed = new EmbedBuilder()
          .setColor(won ? BRAND_COLOR : ERROR_COLOR)
          .setTitle(won ? "🪙 Heads — You Win!" : "🪙 Tails — You Lose!")
          .setDescription(
            won
              ? `**${interaction.user.displayName}** won **${amount.toLocaleString()} frags**! 🎉\nNew balance: **${newBalance.toLocaleString()} frags**`
              : `**${interaction.user.displayName}** lost **${amount.toLocaleString()} frags**.\nNew balance: **${newBalance.toLocaleString()} frags**`,
          );

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        if (err instanceof InsufficientFragsError) {
          return replyError(
            interaction,
            `You only have **${err.balance.toLocaleString()} frags** — not enough to wager **${amount.toLocaleString()}**.`,
          );
        }
        this.container.logger.error(err);
        return replyError(interaction);
      }
    }

    // ── Challenge mode ─────────────────────────────────────────
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "You can't challenge yourself.", flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({
        content: "You can't challenge a bot. Use `/flip <amount>` for a solo flip.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    try {
      const balance = await FragService.getBalance(interaction.user.id);
      if (balance < amount) {
        return replyError(
          interaction,
          `You only have **${balance.toLocaleString()} frags** — not enough to wager **${amount.toLocaleString()}**.`,
        );
      }

      const ts   = Date.now().toString();
      const base = `${interaction.user.id}:${target.id}:${amount}:${ts}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`flip:accept:${base}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId(`flip:decline:${base}`)
          .setLabel("Decline")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("❌"),
      );

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("🪙 Coin Flip Challenge")
        .setDescription(
          `**${interaction.user.displayName}** is challenging <@${target.id}> to a coin flip!\n\n💰 Wager: **${amount.toLocaleString()} frags**\n\n<@${target.id}> — do you accept?`,
        )
        .setFooter({ text: `Challenge expires in ${FLIP_CHALLENGE_TTL_MS / 60_000} minutes` });

      return interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
