import { Command } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { FACEIT_BUTTON_PREFIX, FACEIT_LEVELS } from "../lib/faceitLevels";
import { BRAND_COLOR } from "../constants";

export class SetupFaceitCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("setup-faceit")
        .setDescription("Create FACEIT level roles and post the selection panel (owner only)")
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

    for (const level of FACEIT_LEVELS) {
      const existing = guild.roles.cache.find((r) => r.name === level.name);
      if (existing) {
        resolvedRoles.push({ label: `Level ${level.id.slice(3)}`, roleId: existing.id });
      } else {
        const created = await guild.roles.create({
          name: level.name,
          color: level.color,
          reason: "Created by /setup-faceit",
        });
        resolvedRoles.push({ label: `Level ${level.id.slice(3)}`, roleId: created.id });
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("FACEIT Level Roles")
      .setDescription("Select the role that matches your FACEIT level.\nClicking your current level will remove it.")
      .setColor(BRAND_COLOR);

    const buttons = resolvedRoles.map((r) =>
      new ButtonBuilder()
        .setCustomId(`${FACEIT_BUTTON_PREFIX}${r.roleId}`)
        .setLabel(r.label)
        .setStyle(ButtonStyle.Secondary),
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
    }

    await (interaction.channel as import("discord.js").TextChannel).send({ embeds: [embed], components: rows });
    return interaction.editReply({ content: "FACEIT level roles created and panel posted." });
  }
}
