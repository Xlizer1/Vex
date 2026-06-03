import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { GuildMember } from "discord.js";
import { RoleService } from "../../services/RoleService";
import { RoleNotFoundError } from "../../errors";
import { replyError } from "../../lib/replyError";
import { RANKS } from "../../lib/ranks";

export class RankCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("rank")
        .setDescription("Self-assign a CS2 Premier rating role")
        .addStringOption((o) =>
          o
            .setName("tier")
            .setDescription("Your CS2 Premier rating range")
            .setRequired(true)
            .addChoices(RANKS.map((r) => ({ name: r.name, value: r.name }))),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tier = interaction.options.getString("tier", true);

    if (!interaction.guild) return replyError(interaction, "This command can only be used in a server.");
    if (!(interaction.member instanceof GuildMember)) {
      return replyError(interaction, "Could not resolve your guild membership.");
    }

    try {
      const allNames = RANKS.map((r) => r.name);
      const result   = await RoleService.assignRole(interaction.member, interaction.guild, tier, allNames);

      return interaction.editReply(
        result === "added" ? `You now have the **${tier}** role!` : `Removed the **${tier}** role.`,
      );
    } catch (err) {
      if (err instanceof RoleNotFoundError) {
        return replyError(interaction, "Rank roles haven't been set up yet. Ask an admin to run `/setup-ranks`.");
      }
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
