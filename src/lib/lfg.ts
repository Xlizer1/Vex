import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { RANKS } from "./ranks";
import { FACEIT_LEVELS } from "./faceitLevels";

export const LFG_BUTTON_PREFIX = "lfg:";
export const LFG_CHANNEL_NAME  = "lfg";

export const LFG_MODES = ["Premier", "FACEIT", "Competitive", "Wingman", "Casual / DM"] as const;

// "premier:3" / "faceit:6" → index into RANKS / FACEIT_LEVELS
export const LFG_RANK_CHOICES = [
  ...RANKS.map((r, i) => ({ name: `Premier ${r.name}`, value: `premier:${i}` })),
  ...FACEIT_LEVELS.map((l, i) => ({ name: l.name, value: `faceit:${i}` })),
];

/** The chosen tier plus one either side, so a 15k player also reaches 10k and 20k players. */
export function rolesToPing(choice: string): string[] {
  const [ladder, idxStr] = choice.split(":");
  const list = ladder === "premier" ? RANKS : ladder === "faceit" ? FACEIT_LEVELS : null;
  const idx  = Number(idxStr);
  if (!list || !Number.isInteger(idx) || idx < 0 || idx >= list.length) return [];
  return list.slice(Math.max(0, idx - 1), idx + 2).map((r) => r.name);
}

export function rankLabel(choice: string): string | undefined {
  return LFG_RANK_CHOICES.find((c) => c.value === choice)?.name;
}

/** Squad is stored on the card itself as a list of mentions, so nothing is lost on restart. */
export function parseSquad(fieldValue: string | undefined): string[] {
  return [...(fieldValue ?? "").matchAll(/<@!?(\d+)>/g)].map((m) => m[1]!);
}

export function formatSquad(ids: string[], size: number): string {
  const slots = ids.map((id, i) => `<@${id}>${i === 0 ? " (host)" : ""}`);
  for (let i = ids.length; i < size; i++) slots.push("*open*");
  return slots.join("\n");
}

export const SQUAD_FIELD = "Squad";

/** customId: lfg:<action>:<hostId>:<size>:<createdAt> */
export function lfgButtons(hostId: string, size: number, ts: number, state: "open" | "full" | "closed" = "open") {
  const id = (action: string) => `${LFG_BUTTON_PREFIX}${action}:${hostId}:${size}:${ts}`;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(id("join")).setLabel("Join").setStyle(ButtonStyle.Success).setDisabled(state !== "open"),
    new ButtonBuilder().setCustomId(id("leave")).setLabel("Leave").setStyle(ButtonStyle.Secondary).setDisabled(state === "closed"),
    new ButtonBuilder().setCustomId(id("close")).setLabel("Close").setStyle(ButtonStyle.Danger).setDisabled(state === "closed"),
  );
}
