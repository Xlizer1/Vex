import type { SapphireClient } from "@sapphire/framework";
import { FragService } from "../services/FragService";
import { VOICE_POLL_INTERVAL_MS } from "../constants";

let pollerIntervalId: ReturnType<typeof setInterval> | null = null;

export function startVoiceFragPoller(client: SapphireClient): void {
  if (pollerIntervalId !== null) return; // already running

  pollerIntervalId = setInterval(async () => {
    try {
      const activeIds: string[] = [];

      for (const guild of client.guilds.cache.values()) {
        for (const channel of guild.channels.cache.values()) {
          if (!channel.isVoiceBased()) continue;
          if (channel.id === guild.afkChannelId) continue;

          for (const member of channel.members.values()) {
            if (member.user.bot) continue;
            if (member.voice.selfMute || member.voice.selfDeaf) continue;
            activeIds.push(member.id);
          }
        }
      }

      await FragService.awardVoiceFrags(activeIds);
    } catch (err) {
      client.logger.error(`[voiceFragPoller] error: ${err}`);
    }
  }, VOICE_POLL_INTERVAL_MS);
}

export function stopVoiceFragPoller(): void {
  if (pollerIntervalId !== null) {
    clearInterval(pollerIntervalId);
    pollerIntervalId = null;
  }
}
