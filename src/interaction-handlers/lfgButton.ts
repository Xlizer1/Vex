import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags, PermissionFlagsBits, type ButtonInteraction } from "discord.js";
import { LFG_BUTTON_PREFIX, SQUAD_FIELD, formatSquad, lfgButtons, parseSquad } from "../lib/lfg";
import { LFG_TTL_MS } from "../constants";

type Parsed = { action: "join" | "leave" | "close"; hostId: string; size: number; ts: number };

export class LfgButtonHandler extends InteractionHandler {
  public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(LFG_BUTTON_PREFIX)) return this.none();
    const [action, hostId, sizeStr, tsStr] = interaction.customId.slice(LFG_BUTTON_PREFIX.length).split(":");
    const size = Number(sizeStr);
    const ts   = Number(tsStr);
    if (!["join", "leave", "close"].includes(action!) || !hostId || !size || !ts) return this.none();
    return this.some({ action, hostId, size, ts } as Parsed);
  }

  public override async run(interaction: ButtonInteraction, { action, hostId, size, ts }: Parsed) {
    const userId   = interaction.user.id;
    const original = interaction.message.embeds[0];
    if (!original) return;

    if (Date.now() - ts > LFG_TTL_MS) {
      const embed = EmbedBuilder.from(original).setTitle("LFG expired").setColor(0x808080);
      return interaction.update({ content: null, embeds: [embed], components: [lfgButtons(hostId, size, ts, "closed")] });
    }

    if (action === "close") {
      const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
      if (userId !== hostId && !isMod) {
        return interaction.reply({ content: "Only the host can close this.", flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      return interaction.message.delete().catch(() => null);
    }

    const squad = parseSquad(original.fields.find((f) => f.name === SQUAD_FIELD)?.value);

    if (action === "join") {
      if (squad.includes(userId)) return interaction.reply({ content: "You're already in this squad.", flags: MessageFlags.Ephemeral });
      if (squad.length >= size)   return interaction.reply({ content: "Squad's full.", flags: MessageFlags.Ephemeral });
      squad.push(userId);
    } else {
      if (userId === hostId) return interaction.reply({ content: "You're the host — use **Close** instead.", flags: MessageFlags.Ephemeral });
      if (!squad.includes(userId)) return interaction.reply({ content: "You're not in this squad.", flags: MessageFlags.Ephemeral });
      squad.splice(squad.indexOf(userId), 1);
    }

    const full  = squad.length >= size;
    const embed = EmbedBuilder.from(original).setFields(
      original.fields.map((f) => (f.name === SQUAD_FIELD ? { ...f, value: formatSquad(squad, size) } : f)),
    );
    const baseTitle = original.title?.replace(/ — FULL$/, "") ?? "LFG";
    embed.setTitle(full ? `${baseTitle} — FULL` : baseTitle);

    await interaction.update({ embeds: [embed], components: [lfgButtons(hostId, size, ts, full ? "full" : "open")] });

    if (full && action === "join") {
      const voice = original.fields.find((f) => f.name === "Voice")?.value;
      await interaction.followUp({
        content: `${squad.map((id) => `<@${id}>`).join(" ")} squad's full — ${voice ? `hop in ${voice}` : "find a voice channel"}.`,
        allowedMentions: { users: squad },
      });
    }
  }
}
