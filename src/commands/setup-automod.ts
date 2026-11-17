import { Command } from "@sapphire/framework";
import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  MessageFlags,
  PermissionFlagsBits,
  type AutoModerationActionOptions,
} from "discord.js";
import { AUTOMOD_RULES, SINGLETON_TRIGGERS } from "../lib/automodRules";
import { findLogChannel } from "../lib/auditLog";
import { STAFF_ROLE_NAMES, LOG_CHANNELS } from "../lib/serverLayout";
import { AUTOMOD_TIMEOUT_SECONDS } from "../constants";

export class SetupAutomodCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("setup-automod")
        .setDescription("Create/update AutoMod rules from automodRules.ts (owner only)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild || guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: "Only the server owner can use this command.", flags: MessageFlags.Ephemeral });
    }
    if (!guild.members.me!.permissions.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ content: "I need **Manage Server** and **Timeout Members** to set up AutoMod.", flags: MessageFlags.Ephemeral });
    }

    const alertChannel = findLogChannel(guild, "modActions");
    if (!alertChannel?.isTextBased()) {
      return interaction.reply({ content: `#${LOG_CHANNELS.modActions} not found — run /setup-server first.`, flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const reason = `/setup-automod by ${interaction.user.tag}`;
    const exemptRoles = STAFF_ROLE_NAMES.flatMap((n) => guild.roles.cache.find((r) => r.name === n) ?? []);
    const existing = await guild.autoModerationRules.fetch();
    const notes: string[] = [];

    for (const rule of AUTOMOD_RULES) {
      const actions: AutoModerationActionOptions[] = [
        { type: AutoModerationActionType.SendAlertMessage, metadata: { channel: alertChannel.id } },
      ];
      if (rule.block) actions.push({ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: rule.blockMessage } });
      if (rule.timeout) actions.push({ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: AUTOMOD_TIMEOUT_SECONDS } });

      const options = {
        name: rule.name,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerMetadata: rule.triggerMetadata,
        actions,
        enabled: true,
        exemptRoles,
        reason,
      };

      const match =
        existing.find((r) => r.name === rule.name) ??
        (SINGLETON_TRIGGERS.has(rule.triggerType) ? existing.find((r) => r.triggerType === rule.triggerType) : undefined);

      try {
        if (match) {
          await match.edit(options);
          notes.push(`✏️ Updated **${rule.name}**${match.name !== rule.name ? ` (was "${match.name}")` : ""}`);
        } else {
          await guild.autoModerationRules.create({ ...options, triggerType: rule.triggerType });
          notes.push(`➕ Created **${rule.name}**`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Discord's own built-in rules (created with Community / Safety Setup) can't be edited by bots.
        if (match && match.name !== rule.name && msg.includes("404")) {
          notes.push(`⚠️ **${rule.name}**: Discord's built-in rule "${match.name}" is in the way and bots can't edit it — set it by hand in Server Settings → AutoMod.`);
        } else {
          notes.push(`❌ **${rule.name}**: ${msg}`);
        }
      }
    }

    if (notes.some((n) => n.startsWith("❌"))) {
      notes.push("\nIf every rule failed, enable **Community** in Server Settings first — AutoMod needs it.");
    }
    notes.push(`\nAlerts go to ${alertChannel}. Send a test message for each rule from a non-admin account.`);
    return interaction.editReply(notes.join("\n").slice(0, 2000));
  }
}
