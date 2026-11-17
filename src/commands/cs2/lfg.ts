import { Command } from "@sapphire/framework";
import { EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import {
  LFG_CHANNEL_NAME,
  LFG_MODES,
  LFG_RANK_CHOICES,
  SQUAD_FIELD,
  formatSquad,
  lfgButtons,
  rankLabel,
  rolesToPing,
} from "../../lib/lfg";
import { BRAND_COLOR, LFG_TTL_MS } from "../../constants";

export class LfgCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("lfg")
        .setDescription("Looking for group — post a squad card and ping players near your rank")
        .addStringOption((o) =>
          o.setName("mode").setDescription("What you're playing").setRequired(true)
            .addChoices(...LFG_MODES.map((m) => ({ name: m, value: m }))),
        )
        .addIntegerOption((o) =>
          o.setName("players").setDescription("How many more players you need").setRequired(true).setMinValue(1).setMaxValue(4),
        )
        .addStringOption((o) =>
          o.setName("rank").setDescription("Your rank — pings this tier and the ones either side").setRequired(false)
            .addChoices(...LFG_RANK_CHOICES),
        )
        .addStringOption((o) =>
          o.setName("note").setDescription("e.g. 'mic required', 'on in 10 min'").setRequired(false).setMaxLength(100),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const lfgChannel = guild.channels.cache.find((c) => c.name === LFG_CHANNEL_NAME && c.isTextBased());
    if (lfgChannel && interaction.channelId !== lfgChannel.id) {
      return interaction.reply({ content: `Post LFG in ${lfgChannel}.`, flags: MessageFlags.Ephemeral });
    }

    const mode    = interaction.options.getString("mode", true);
    const players = interaction.options.getInteger("players", true);
    const rank    = interaction.options.getString("rank");
    const note    = interaction.options.getString("note");

    if (mode === "Wingman" && players > 1) {
      return interaction.reply({ content: "Wingman is 2v2 — you only need 1 more.", flags: MessageFlags.Ephemeral });
    }

    const size  = players + 1;
    const ts    = Date.now();
    const voice = interaction.member instanceof GuildMember ? interaction.member.voice.channel : null;
    const roles = rank
      ? rolesToPing(rank).flatMap((name) => guild.roles.cache.find((r) => r.name === name) ?? [])
      : [];

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`LFG — ${mode}`)
      .setFooter({ text: `Expires in ${LFG_TTL_MS / 60_000} min` })
      .setTimestamp(ts);
    if (note) embed.setDescription(note);
    if (rank) embed.addFields({ name: "Rank", value: rankLabel(rank) ?? rank, inline: true });
    if (voice) embed.addFields({ name: "Voice", value: `${voice}`, inline: true });
    embed.addFields({ name: SQUAD_FIELD, value: formatSquad([interaction.user.id], size) });

    const response = await interaction.reply({
      content: roles.length ? roles.map((r) => `${r}`).join(" ") : undefined,
      embeds: [embed],
      components: [lfgButtons(interaction.user.id, size, ts)],
      allowedMentions: { roles: roles.map((r) => r.id) },
      withResponse: true,
    });

    // shortcut: in-memory timer, lost on restart; the button handler also rejects expired cards.
    const message = response.resource?.message;
    if (message) setTimeout(() => message.delete().catch(() => null), LFG_TTL_MS);
  }
}
