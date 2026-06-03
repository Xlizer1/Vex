import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import { SteamService } from "../../services/SteamService";
import { SteamResolutionError } from "../../errors";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

export class LinkSteamCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("linksteam")
        .setDescription("Link your Steam account to your Discord profile")
        .addStringOption((o) =>
          o
            .setName("profile_url")
            .setDescription("Your Steam profile URL, Steam64 ID, or vanity name (leave blank for help)")
            .setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const input = interaction.options.getString("profile_url");

    if (!input) {
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("Link your Steam account")
        .setDescription(
          "Click the button below to open your Steam profile, then copy the URL from your browser's address bar and run `/linksteam <url>`.\n\nYou can also just type your Steam vanity name directly, e.g. `/linksteam xlizer`.",
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Open my Steam Profile")
          .setStyle(ButtonStyle.Link)
          .setURL("https://steamcommunity.com/my/")
          .setEmoji("🔗"),
      );

      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    try {
      await SteamService.link(interaction.user.id, input);
      return interaction.editReply("Steam account linked! Use `/stats` to view your CS2 stats.");
    } catch (err) {
      if (err instanceof SteamResolutionError) {
        return replyError(
          interaction,
          "Could not resolve that Steam profile. Make sure you're using a valid Steam profile URL, Steam64 ID, or vanity name.",
        );
      }
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
