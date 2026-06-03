import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { FragService } from "../../services/FragService";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class BalanceCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("balance")
        .setDescription("Check frag balance")
        .addUserOption((o) =>
          o.setName("user").setDescription("User to check (defaults to yourself)").setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const frags = await FragService.getBalance(target.id);
      const isSelf = target.id === interaction.user.id;

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("Frag Balance")
        .setDescription(
          `**${isSelf ? "You" : target.displayName}** ${isSelf ? "have" : "has"} **${frags.toLocaleString()} frags** 💰`,
        )
        .setThumbnail(target.displayAvatarURL());

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
