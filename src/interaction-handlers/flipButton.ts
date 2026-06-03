import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, type ButtonInteraction } from "discord.js";
import { FragService } from "../services/FragService";
import { InsufficientFragsError } from "../errors";
import { BRAND_COLOR, ERROR_COLOR, FLIP_CHALLENGE_TTL_MS } from "../constants";

function buildDisabledRow(acceptId: string, declineId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(acceptId).setLabel("Accept").setStyle(ButtonStyle.Success).setEmoji("✅").setDisabled(true),
    new ButtonBuilder().setCustomId(declineId).setLabel("Decline").setStyle(ButtonStyle.Danger).setEmoji("❌").setDisabled(true),
  );
}

function parseCustomId(customId: string): {
  action: string;
  challengerId: string;
  targetId: string;
  amount: number;
  ts: number;
} | null {
  const parts = customId.split(":");
  if (parts.length !== 6) return null;
  const [, action, challengerId, targetId, amountStr, tsStr] = parts;
  const amount = parseInt(amountStr!, 10);
  const ts     = parseInt(tsStr!, 10);
  if (!action || !challengerId || !targetId || isNaN(amount) || isNaN(ts)) return null;
  return { action, challengerId, targetId, amount, ts };
}

export class FlipButtonHandler extends InteractionHandler {
  public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("flip:")) return this.none();
    return this.some();
  }

  public override async run(interaction: ButtonInteraction) {
    const parsed = parseCustomId(interaction.customId);

    if (!parsed) {
      return interaction.reply({ content: "Malformed flip challenge. Please start a new one.", flags: MessageFlags.Ephemeral });
    }

    const { action, challengerId, targetId, amount, ts } = parsed;
    const acceptId  = `flip:accept:${challengerId}:${targetId}:${amount}:${ts}`;
    const declineId = `flip:decline:${challengerId}:${targetId}:${amount}:${ts}`;
    const disabledRow = buildDisabledRow(acceptId, declineId);

    if (Date.now() - ts > FLIP_CHALLENGE_TTL_MS) {
      return interaction.update({
        content: "This flip challenge has expired.",
        embeds: [],
        components: [disabledRow],
      });
    }

    if (interaction.user.id !== targetId) {
      return interaction.reply({ content: "This challenge isn't for you.", flags: MessageFlags.Ephemeral });
    }

    if (action === "decline") {
      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(ERROR_COLOR)
            .setTitle("🪙 Challenge Declined")
            .setDescription(`<@${targetId}> declined the coin flip challenge from <@${challengerId}>.`),
        ],
        components: [disabledRow],
      });
    }

    // Accept
    try {
      const { winnerId, loserId, winnerBalance } = await FragService.resolveFlipChallenge(
        challengerId, targetId, amount,
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(BRAND_COLOR)
            .setTitle("🪙 Coin Flip Result")
            .setDescription(
              `<@${winnerId}> won the flip and takes **${amount.toLocaleString()} frags** from <@${loserId}>! 🎉\n\n<@${winnerId}>'s new balance: **${winnerBalance.toLocaleString()} frags**`,
            ),
        ],
        components: [disabledRow],
      });
    } catch (err) {
      if (err instanceof InsufficientFragsError) {
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(ERROR_COLOR)
              .setTitle("🪙 Flip Cancelled")
              .setDescription("One of the players no longer has enough frags to cover the wager."),
          ],
          components: [disabledRow],
        });
      }
      this.container.logger.error(err);
      return interaction.update({
        content: "Something went wrong resolving the flip.",
        embeds: [],
        components: [disabledRow],
      });
    }
  }
}
