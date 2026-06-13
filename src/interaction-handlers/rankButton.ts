import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { GuildMember, MessageFlags, type ButtonInteraction } from "discord.js";
import { RoleService } from "../services/RoleService";
import { RoleNotFoundError } from "../errors";
import { RANKS, RANK_BUTTON_PREFIX } from "../lib/ranks";

export class RankButtonHandler extends InteractionHandler {
  public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(RANK_BUTTON_PREFIX)) return this.none();
    return this.some();
  }

  public override async run(interaction: ButtonInteraction) {
    const roleId = interaction.customId.slice(RANK_BUTTON_PREFIX.length);

    if (!interaction.guild || !(interaction.member instanceof GuildMember)) {
      return interaction.reply({ content: "Could not resolve guild membership.", flags: MessageFlags.Ephemeral });
    }

    try {
      await interaction.guild.roles.fetch();
      const clickedRole = interaction.guild.roles.cache.get(roleId);
      if (!clickedRole) throw new RoleNotFoundError(roleId);

      const allNames = RANKS.map((r) => r.name);
      const result   = await RoleService.assignRole(interaction.member, interaction.guild, clickedRole.name, allNames);

      return interaction.reply({
        content: result === "added" ? `You now have the **${clickedRole.name}** role!` : `Removed the **${clickedRole.name}** role.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      if (err instanceof RoleNotFoundError) {
        return interaction.reply({
          content: "This role no longer exists. Ask an admin to run `/setup-ranks` again.",
          flags: MessageFlags.Ephemeral,
        });
      }
      this.container.logger.error(err);
      return interaction.reply({
        content: "Something went wrong. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
