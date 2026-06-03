import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { FragService } from "../../services/FragService";
import { CooldownError } from "../../errors";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR, DAILY_FRAGS } from "../../constants";

export class DailyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("daily").setDescription(`Claim your daily ${DAILY_FRAGS} frags`),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { newBalance } = await FragService.claimDaily(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("Daily Frags Claimed!")
        .setDescription(
          `You claimed your daily **${DAILY_FRAGS} frags**! 💰\nNew balance: **${newBalance.toLocaleString()} frags**`,
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err instanceof CooldownError) {
        const hours   = Math.floor(err.remainingMs / 3_600_000);
        const minutes = Math.floor((err.remainingMs % 3_600_000) / 60_000);
        return replyError(interaction, `You already claimed today. Come back in **${hours}h ${minutes}m**.`);
      }
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
