import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { eq } from "drizzle-orm";
import { LeetifyClient } from "leetify-api";
import { db } from "../../db";
import { users } from "../../db/schema";
import { config } from "../../lib/config";
import { replyError } from "../../lib/replyError";
import { fmt, fmtMap, toUnixSeconds } from "../../lib/formatters";
import { BRAND_COLOR, RECENT_MATCHES_COUNT } from "../../constants";

export class StatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("stats")
        .setDescription("View CS2 stats for a linked Steam account")
        .addUserOption((o) =>
          o.setName("user").setDescription("User to look up (defaults to yourself)").setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const target = interaction.options.getUser("user") ?? interaction.user;

      const row = await db
        .select({ steamId: users.steamId })
        .from(users)
        .where(eq(users.id, target.id))
        .then((r) => r[0]);

      if (!row?.steamId) {
        return replyError(
          interaction,
          target.id === interaction.user.id
            ? "You haven't linked your Steam account yet. Use `/linksteam` to link it."
            : `**${target.username}** hasn't linked their Steam account yet.`,
        );
      }

      const client  = new LeetifyClient(config.LEETIFY_API_KEY);
      const profile = await client.getProfile({ steamId: row.steamId }).catch(() => null);

      if (!profile) {
        return replyError(
          interaction,
          "No Leetify profile found for this Steam account. The profile may be private or not registered on Leetify.",
        );
      }

      const { ranks, rating, stats, winrate, total_matches, recent_matches, name, steam64_id } = profile;

      const ratingLine = rating
        ? [
            `🎯 Aim: **${fmt(rating.aim)}**`,
            `📍 Positioning: **${fmt(rating.positioning)}**`,
            `💣 Utility: **${fmt(rating.utility)}**`,
          ].join("  ·  ")
        : "No rating data yet";

      const recentLines = (recent_matches ?? [])
        .slice(0, RECENT_MATCHES_COUNT)
        .map((m) => {
          const outcome = m.outcome === "win" ? "✅" : m.outcome === "loss" ? "❌" : "➖";
          const score   = `${m.score[0]}-${m.score[1]}`;
          const rating  = m.leetify_rating != null ? (m.leetify_rating * 100).toFixed(2) : "N/A";
          return `${outcome} **${fmtMap(m.map_name)}** ${score}  ·  Rating: ${rating}  ·  <t:${toUnixSeconds(m.finished_at)}:d>`;
        })
        .join("\n") || "No recent matches";

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`CS2 Stats — ${name}`)
        .setURL(`https://leetify.com/app/profile/${steam64_id}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields({ name: "Ratings", value: ratingLine });

      if (ranks?.premier != null) {
        embed.addFields({ name: "🏆 Premier", value: `**${ranks.premier.toLocaleString()}**`, inline: true });
      }

      if (ranks?.faceit != null) {
        const faceitVal = ranks.faceit_elo != null
          ? `Level **${ranks.faceit}** (${ranks.faceit_elo} ELO)`
          : `Level **${ranks.faceit}**`;
        embed.addFields({ name: "🎮 FACEIT", value: faceitVal, inline: true });
      }

      embed
        .addFields(
          {
            name: "Stats",
            value: [
              `HS%: **${fmt(stats?.accuracy_head, 1)}%**`,
              `Win Rate: **${fmt((winrate ?? 0) * 100, 1)}%**`,
              `Matches: **${total_matches ?? 0}**`,
            ].join("  ·  "),
          },
          { name: "Recent Matches", value: recentLines },
        )
        .setFooter({ text: "Data Provided by Leetify • View on Leetify", iconURL: "https://leetify.com/favicon.ico" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction);
    }
  }
}
