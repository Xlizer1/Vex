import { Command } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { RANK_BUTTON_PREFIX, RANKS } from "../lib/ranks";
import { BRAND_COLOR } from "../constants";

export class SetupRanksCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("setup-ranks")
        .setDescription("Create CS2 rating roles and post the rank selection panel (owner only)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.guild?.ownerId !== interaction.user.id) {
      return interaction.reply({ content: "Only the server owner can use this command.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;
    const resolvedRoles: { label: string; roleId: string }[] = [];

    for (const rank of RANKS) {
      const existing = guild.roles.cache.find((r) => r.name === rank.name);
      if (existing) {
        resolvedRoles.push({ label: rank.name, roleId: existing.id });
      } else {
        const created = await guild.roles.create({
          name: rank.name,
          color: rank.color,
          reason: "Created by /setup-ranks",
        });
        resolvedRoles.push({ label: rank.name, roleId: created.id });
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("CS2 Rating Roles")
      .setDescription("Select the role that matches your CS2 Premier rating.\nClicking your current role will remove it.")
      .setColor(BRAND_COLOR);

    const buttons = resolvedRoles.map((r) =>
      new ButtonBuilder()
        .setCustomId(`${RANK_BUTTON_PREFIX}${r.roleId}`)
        .setLabel(r.label)
        .setStyle(ButtonStyle.Secondary),
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
    }

    await (interaction.channel as import("discord.js").TextChannel).send({ embeds: [embed], components: rows });
    return interaction.editReply({ content: "Rating roles created and panel posted." });
  }
}
