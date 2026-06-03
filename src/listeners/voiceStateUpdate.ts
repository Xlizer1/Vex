import { Listener } from "@sapphire/framework";
import { AuditLogEvent, EmbedBuilder, Events, type VoiceState } from "discord.js";
import { sendAuditLog } from "../lib/auditLog";
import { BRAND_COLOR, ERROR_COLOR, AUDIT_LOG_GRACE_MS, AUDIT_LOG_RECENCY_MS } from "../constants";

async function getAuditExecutor(state: VoiceState, event: AuditLogEvent): Promise<string | null> {
  await new Promise((r) => setTimeout(r, AUDIT_LOG_GRACE_MS));
  const logs = await state.guild.fetchAuditLogs({ type: event, limit: 5 }).catch(() => null);
  if (!logs) return null;

  const entry = logs.entries.find((e) => {
    const isRecent = Date.now() - e.createdTimestamp < AUDIT_LOG_RECENCY_MS;
    const notSelf  = e.executor?.id !== state.member?.id;
    return isRecent && notSelf;
  });

  return entry?.executor ? `<@${entry.executor.id}> — ${entry.executor.tag}` : null;
}

export class VoiceStateUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.VoiceStateUpdate });
  }

  public async run(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    try {
      let action: string;
      let color    = BRAND_COLOR;
      let executor: string | null = null;

      if (!oldState.channel && newState.channel) {
        action = `🔊 Joined **${newState.channel.name}**`;
      } else if (oldState.channel && !newState.channel) {
        executor = await getAuditExecutor(oldState, AuditLogEvent.MemberDisconnect);
        action   = executor
          ? `🔴 Forcibly disconnected from **${oldState.channel.name}**`
          : `🔇 Left **${oldState.channel.name}**`;
        if (executor) color = ERROR_COLOR;
      } else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
        executor = await getAuditExecutor(newState, AuditLogEvent.MemberMove);
        action   = `🔀 Moved **${oldState.channel.name}** → **${newState.channel.name}**`;
        if (executor) color = ERROR_COLOR;
      } else {
        return;
      }

      const fields = [
        { name: "User",   value: `${member} — ${member.user.tag}`, inline: true },
        { name: "Action", value: action,                           inline: true },
      ];
      if (executor) fields.push({ name: "By", value: executor, inline: true });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle("Voice Update")
        .addFields(fields)
        .setTimestamp();

      await sendAuditLog(member.guild, embed);
    } catch (err) {
      this.container.logger.error(`VoiceStateUpdate audit error for ${member.id}: ${err}`);
    }
  }
}
