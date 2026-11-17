import { ChannelType } from "discord.js";

// ─── EDIT THIS FILE to decide the server layout, then run /setup-server ───
// /setup-server creates anything missing, renames channels listed in `from`,
// and orders everything as written here. It never deletes: channels not listed
// here are reported back to you so you can remove them by hand.
//
// Text channel names must be lowercase-with-dashes (Discord forces this).

export type LayoutChannel = {
  name: string;
  type: ChannelType.GuildText | ChannelType.GuildVoice;
  topic?: string;      // text only
  userLimit?: number;  // voice only, 0 = unlimited
  from?: string[];     // old names to rename from
  readOnly?: boolean;  // members can read but not post (staff + Vex still can)
};

export type LayoutCategory = {
  name: string;
  staffOnly?: boolean; // hidden from everyone except STAFF_ROLE_NAMES
  from?: string[];
  channels: LayoutChannel[];
};

const text  = (name: string, extra: Partial<LayoutChannel> = {}): LayoutChannel => ({ name, type: ChannelType.GuildText, ...extra });
const voice = (name: string, extra: Partial<LayoutChannel> = {}): LayoutChannel => ({ name, type: ChannelType.GuildVoice, ...extra });

export const STAFF_ROLE_NAMES = ["Root", "Domain Control"];

// Where each kind of log goes. These must exist in the staffOnly category below.
export const LOG_CHANNELS = {
  modActions: "mod-actions",  // bans, kicks, timeouts, warns (Vex or Discord UI)
  members:    "member-log",   // joins, leaves, role + nickname changes
  messages:   "message-log",  // edits, deletes, bulk deletes
  voice:      "voice-log",    // joins, leaves, moves
  server:     "server-log",   // channels, roles, permissions, invites, settings
} as const;

export type LogKind = keyof typeof LOG_CHANNELS;

export const SERVER_LAYOUT: LayoutCategory[] = [
  {
    name: "info",
    channels: [
      text("rules", { readOnly: true }),
      text("announcements", { readOnly: true, topic: "Server news and updates" }),
      text("welcome", { readOnly: true }),
      text("roles", { readOnly: true, from: ["set-your-rank"], topic: "Pick your Premier rating and FACEIT level" }),
    ],
  },
  {
    name: "community",
    channels: [
      text("chat"),
      text("clips", { topic: "Your best (and worst) moments" }),
      text("commands", { topic: "Bot commands go here" }),
    ],
  },
  {
    name: "Counter Strike 2",
    channels: [
      text("lfg", { topic: "Looking for group — post your rank and how many you need" }),
      text("cs-talk", { topic: "Strats, updates, skins" }),
      voice("Lobby"),
      voice("Match 1", { userLimit: 5 }),
      voice("Match 2", { userLimit: 5 }),
      voice("FACEIT", { userLimit: 6 }),
    ],
  },
  {
    name: "GTA 6",
    channels: [
      text("gta-chat", { topic: "GTA 6 talk — NO story spoilers here, use #gta-spoilers. Screenshots and clips go in #clips." }),
      text("gta-spoilers", { topic: "Story spoilers allowed. Enter at your own risk." }),
      voice("GTA 6"),
    ],
  },
  {
    name: "Chill",
    channels: [
      voice("General"),
      voice("Gaming"),
      voice("study", { userLimit: 5 }),
      voice("afk"),
    ],
  },
  {
    name: "mods",
    staffOnly: true,
    channels: [
      text("mod-chat"),
      text(LOG_CHANNELS.modActions, { from: ["mod-logs"] }),
      text(LOG_CHANNELS.members),
      text(LOG_CHANNELS.messages),
      text(LOG_CHANNELS.voice),
      text(LOG_CHANNELS.server),
      voice("staff"),
    ],
  },
];

export const STAFF_CATEGORY = SERVER_LAYOUT.find((c) => c.staffOnly)!.name;
