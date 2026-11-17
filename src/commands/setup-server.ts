import { Command } from "@sapphire/framework";
import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type CategoryChannel,
  type ChannelPosition,
  type GuildBasedChannel,
  type OverwriteResolvable,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { SERVER_LAYOUT, STAFF_ROLE_NAMES } from "../lib/serverLayout";
import { RANKS } from "../lib/ranks";
import { FACEIT_LEVELS } from "../lib/faceitLevels";

export class SetupServerCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("setup-server")
        .setDescription("Apply the channel layout from serverLayout.ts (owner only, never deletes)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild || guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: "Only the server owner can use this command.", flags: MessageFlags.Ephemeral });
    }

    const me = guild.members.me!;
    if (!me.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
      return interaction.reply({ content: "I need **Manage Channels** and **Manage Roles** to do this.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const notes: string[] = [];
    const reason = `/setup-server by ${interaction.user.tag}`;

    await guild.channels.fetch();
    await guild.roles.fetch();
    const all = [...guild.channels.cache.values()].filter((c) => !c.isThread());
    const used = new Set<string>();
    const find = (type: ChannelType, names: string[]) =>
      all.find((c) => c.type === type && !used.has(c.id) && names.some((n) => n.toLowerCase() === c.name.toLowerCase()));

    const staffRoles = STAFF_ROLE_NAMES.flatMap((n) => guild.roles.cache.find((r) => r.name === n) ?? []);
    const missingStaff = STAFF_ROLE_NAMES.filter((n) => !staffRoles.some((r) => r.name === n));
    if (missingStaff.length) notes.push(`⚠️ Staff roles not found: ${missingStaff.join(", ")} — they won't see the staff category.`);

    const staffOverwrites: OverwriteResolvable[] = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...staffRoles.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] })),
      { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
    ];

    const readOnlyOverwrites: OverwriteResolvable[] = [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
        ],
      },
      ...staffRoles.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.SendMessages] })),
      { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
    ];

    const positions: ChannelPosition[] = [];

    try {
      for (const [ci, cat] of SERVER_LAYOUT.entries()) {
        let category = find(ChannelType.GuildCategory, [cat.name, ...(cat.from ?? [])]) as CategoryChannel | undefined;
        if (!category) {
          category = await guild.channels.create({
            name: cat.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: cat.staffOnly ? staffOverwrites : undefined,
            reason,
          });
          notes.push(`➕ Category **${cat.name}**`);
        } else {
          if (category.name !== cat.name) {
            notes.push(`✏️ Category **${category.name}** → **${cat.name}**`);
            await category.setName(cat.name, reason);
          }
          if (cat.staffOnly) await category.permissionOverwrites.set(staffOverwrites, reason);
        }
        used.add(category.id);
        positions.push({ channel: category.id, position: ci });

        for (const [i, ch] of cat.channels.entries()) {
          let channel = find(ch.type, [ch.name, ...(ch.from ?? [])]) as TextChannel | VoiceChannel | undefined;
          if (!channel) {
            channel = (await guild.channels.create({
              name: ch.name,
              type: ch.type,
              parent: category.id,
              topic: ch.topic,
              userLimit: ch.userLimit,
              permissionOverwrites: cat.staffOnly ? staffOverwrites : ch.readOnly ? readOnlyOverwrites : undefined,
              reason,
            })) as TextChannel | VoiceChannel;
            notes.push(`➕ ${ch.type === ChannelType.GuildVoice ? "🔊" : "#"}${ch.name}`);
          } else {
            const edit: Record<string, unknown> = {};
            if (channel.name !== ch.name) {
              edit.name = ch.name;
              notes.push(`✏️ ${channel.name} → ${ch.name}`);
            }
            if (ch.topic !== undefined && "topic" in channel && channel.topic !== ch.topic) edit.topic = ch.topic;
            if (ch.userLimit !== undefined && "userLimit" in channel && channel.userLimit !== ch.userLimit) edit.userLimit = ch.userLimit;
            // The layout has no NSFW channels; an NSFW flag means a misclick (it age-gates the channel).
            if (channel.nsfw) {
              edit.nsfw = false;
              notes.push(`🔞 Removed NSFW flag from ${channel.name}`);
            }
            if (Object.keys(edit).length) await channel.edit({ ...edit, reason });
            if (ch.readOnly && !cat.staffOnly) await channel.permissionOverwrites.set(readOnlyOverwrites, reason);
          }
          used.add(channel.id);
          // Read-only channels keep the overwrites set above; everything else syncs to its category,
          // which clears one-off overwrites (e.g. a channel hidden from everyone but one role).
          positions.push({ channel: channel.id, position: i, parent: category.id, lockPermissions: !ch.readOnly || !!cat.staffOnly });
        }
      }

      await guild.channels.setPositions(positions);

      // Rank/FACEIT roles are labels only; any permission on them bypasses what @everyone is denied.
      for (const name of [...RANKS, ...FACEIT_LEVELS].map((r) => r.name)) {
        const role = guild.roles.cache.find((r) => r.name === name);
        if (!role || role.permissions.bitfield === 0n) continue;
        if (!role.editable) {
          notes.push(`⚠️ Can't edit role **${name}** — move Vex's role above it`);
          continue;
        }
        await role.setPermissions([], reason);
        notes.push(`🧹 Cleared permissions on **${name}**`);
      }
    } catch (err) {
      this.container.logger.error(err);
      notes.push(`❌ Stopped early: ${err instanceof Error ? err.message : err}`);
    }

    const leftover = all.filter((c: GuildBasedChannel) => !used.has(c.id));
    if (leftover.length) {
      notes.push(`\n**Not in layout (left alone — delete by hand if unwanted):**`);
      notes.push(leftover.map((c) => (c.type === ChannelType.GuildCategory ? `📁 ${c.name}` : `<#${c.id}>`)).join(", "));
    }

    const summary = notes.length ? notes.join("\n") : "Everything already matches the layout.";
    return interaction.editReply(summary.slice(0, 2000));
  }
}
