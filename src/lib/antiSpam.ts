import type { Message } from "discord.js";
import {
  SPAM_CHANNEL_THRESHOLD,
  SPAM_MEDIA_THRESHOLD,
  SPAM_MEDIA_WINDOW_MS,
  SPAM_WINDOW_MS,
} from "../constants";

export type SpamEntry = {
  at: number;
  channelId: string;
  messageId: string;
  fingerprint: string; // "" when there's nothing to compare (e.g. a sticker)
  hasMedia: boolean;   // link or attachment
};

export const ANTISPAM_BUTTON_PREFIX = "antispam:";

// shortcut: in-memory, per-process; a restart forgets the last 30s, which is fine for this purpose.
const recent = new Map<string, SpamEntry[]>();

export function toEntry(message: Message, now = Date.now()): SpamEntry {
  const text  = message.content.trim().toLowerCase().replace(/\s+/g, " ");
  const files = message.attachments.map((a) => `${a.name}:${a.size}`).sort().join("|");
  return {
    at: now,
    channelId: message.channelId,
    messageId: message.id,
    fingerprint: [text, files].filter(Boolean).join("#"),
    hasMedia: message.attachments.size > 0 || /https?:\/\//i.test(message.content),
  };
}

/** Records the entry; returns the offending messages if this user now looks like a hacked spammer. */
export function track(userId: string, entry: SpamEntry): SpamEntry[] | null {
  const list = (recent.get(userId) ?? []).filter((e) => entry.at - e.at < SPAM_WINDOW_MS);
  list.push(entry);
  recent.set(userId, list);

  let hits: SpamEntry[] = [];
  if (entry.fingerprint) {
    const same = list.filter((e) => e.fingerprint === entry.fingerprint);
    if (new Set(same.map((e) => e.channelId)).size >= SPAM_CHANNEL_THRESHOLD) hits = same;
  }
  if (!hits.length && entry.hasMedia) {
    const burst = list.filter((e) => e.hasMedia && entry.at - e.at < SPAM_MEDIA_WINDOW_MS);
    if (burst.length >= SPAM_MEDIA_THRESHOLD) hits = burst;
  }
  if (!hits.length) return null;

  recent.delete(userId); // don't fire again for the same burst
  return hits;
}

export function resetAntiSpam(): void {
  recent.clear();
}
