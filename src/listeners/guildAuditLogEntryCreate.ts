import { Listener } from "@sapphire/framework";
import { AuditLogEvent, EmbedBuilder, Events, type Guild, type GuildAuditLogsEntry } from "discord.js";
import { sendLog } from "../lib/auditLog";
import type { LogKind } from "../lib/serverLayout";
import { BRAND_COLOR, ERROR_COLOR } from "../constants";

type Route = { kind: LogKind; title: string; danger?: boolean };

const ROUTES: Partial<Record<AuditLogEvent, Route>> = {
  [AuditLogEvent.MemberBanAdd]:            { kind: "modActions", title: "Member Banned", danger: true },
  [AuditLogEvent.MemberBanRemove]:         { kind: "modActions", title: "Member Unbanned" },
  [AuditLogEvent.MemberKick]:              { kind: "modActions", title: "Member Kicked", danger: true },
  [AuditLogEvent.MemberPrune]:             { kind: "modActions", title: "Members Pruned", danger: true },
  [AuditLogEvent.MemberRoleUpdate]:        { kind: "members",    title: "Member Roles Changed" },
  [AuditLogEvent.MessageBulkDelete]:       { kind: "messages",   title: "Messages Bulk Deleted", danger: true },
  [AuditLogEvent.ChannelCreate]:           { kind: "server",     title: "Channel Created" },
  [AuditLogEvent.ChannelUpdate]:           { kind: "server",     title: "Channel Updated" },
  [AuditLogEvent.ChannelDelete]:           { kind: "server",     title: "Channel Deleted", danger: true },
  [AuditLogEvent.ChannelOverwriteCreate]:  { kind: "server",     title: "Channel Permissions Added" },
  [AuditLogEvent.ChannelOverwriteUpdate]:  { kind: "server",     title: "Channel Permissions Changed" },
  [AuditLogEvent.ChannelOverwriteDelete]:  { kind: "server",     title: "Channel Permissions Removed" },
  [AuditLogEvent.RoleCreate]:              { kind: "server",     title: "Role Created" },
  [AuditLogEvent.RoleUpdate]:              { kind: "server",     title: "Role Updated" },
  [AuditLogEvent.RoleDelete]:              { kind: "server",     title: "Role Deleted", danger: true },
  [AuditLogEvent.InviteCreate]:            { kind: "server",     title: "Invite Created" },
  [AuditLogEvent.InviteDelete]:            { kind: "server",     title: "Invite Deleted" },
  [AuditLogEvent.GuildUpdate]:             { kind: "server",     title: "Server Settings Changed", danger: true },
  [AuditLogEvent.WebhookCreate]:           { kind: "server",     title: "Webhook Created", danger: true },
  [AuditLogEvent.WebhookDelete]:           { kind: "server",     title: "Webhook Deleted" },
  [AuditLogEvent.BotAdd]:                  { kind: "server",     title: "Bot Added", danger: true },
};

const TARGET_MENTION: Record<string, (id: string) => string> = {
  User:    (id) => `<@${id}> (${id})`,
  Channel: (id) => `<#${id}> (${id})`,
  Role:    (id) => `<@&${id}> (${id})`,
};

function fmtValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" && "name" in x ? x.name : JSON.stringify(x))).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function fmtChanges(entry: GuildAuditLogsEntry): string {
  const lines = entry.changes.map((c) => {
    if (c.key === "$add")    return `➕ ${fmtValue(c.new)}`;
    if (c.key === "$remove") return `➖ ${fmtValue(c.new)}`;
    if (c.key === "communication_disabled_until") {
      return c.new ? `⏱️ Timed out until <t:${Math.floor(Date.parse(String(c.new)) / 1000)}:f>` : "⏱️ Timeout removed";
    }
    return `**${c.key}**: ${fmtValue(c.old)} → ${fmtValue(c.new)}`;
  });
  return lines.join("\n").slice(0, 1024);
}

// Timeouts and nickname changes both arrive as MemberUpdate; split by what changed.
function routeFor(entry: GuildAuditLogsEntry): Route | undefined {
  if (entry.action !== AuditLogEvent.MemberUpdate) return ROUTES[entry.action];
  if (entry.changes.some((c) => c.key === "communication_disabled_until")) {
    return { kind: "modActions", title: "Member Timeout Changed", danger: true };
  }
  if (entry.changes.some((c) => c.key === "nick")) return { kind: "members", title: "Nickname Changed" };
  return undefined;
}

export class GuildAuditLogEntryCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildAuditLogEntryCreate });
  }

  public async run(entry: GuildAuditLogsEntry, guild: Guild) {
    const route = routeFor(entry);
    if (!route) return;

    // Vex's own mod commands already post a richer case embed, and its rank buttons would spam role logs.
    const byBot = entry.executorId === this.container.client.user?.id;
    if (byBot && (route.kind === "modActions" || route.kind === "members")) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(route.danger ? ERROR_COLOR : BRAND_COLOR)
        .setTitle(route.title)
        .setTimestamp(entry.createdAt);

      if (entry.targetId) {
        const mention = TARGET_MENTION[entry.targetType]?.(entry.targetId) ?? entry.targetId;
        embed.addFields({ name: "Target", value: mention, inline: true });
      }
      embed.addFields({ name: "By", value: entry.executorId ? `<@${entry.executorId}>` : "Unknown", inline: true });
      if (entry.reason) embed.addFields({ name: "Reason", value: entry.reason.slice(0, 1024) });

      const changes = fmtChanges(entry);
      if (changes) embed.addFields({ name: "Changes", value: changes });

      if (entry.action === AuditLogEvent.MessageBulkDelete && entry.extra && typeof entry.extra === "object" && "count" in entry.extra) {
        embed.addFields({ name: "Count", value: String(entry.extra.count), inline: true });
      }

      await sendLog(guild, route.kind, embed);
    } catch (err) {
      this.container.logger.error(`AuditLogEntry ${entry.action} error: ${err}`);
    }
  }
}
