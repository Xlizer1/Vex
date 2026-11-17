import { container } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type Message,
} from "discord.js";
import { ANTISPAM_BUTTON_PREFIX, toEntry, track, type SpamEntry } from "../lib/antiSpam";
import { sendLog } from "../lib/auditLog";
import { ERROR_COLOR, SPAM_TIMEOUT_MS } from "../constants";

export const AntiSpamService = {
  /** Returns true if the message was handled as spam. */
  async check(message: Message<true>): Promise<boolean> {
    const member = message.member;
    if (!member || member.permissions.has(PermissionFlagsBits.ModerateMembers)) return false;

    const hits = track(member.id, toEntry(message));
    if (!hits) return false;

    await this.contain(message, hits);
    return true;
  },

  async contain(message: Message<true>, hits: SpamEntry[]): Promise<void> {
    const { guild, member, author } = message;
    const reason = "Anti-spam: looks like a compromised account";

    const timedOut = member?.moderatable
      ? await member.timeout(SPAM_TIMEOUT_MS, reason).then(() => true, (err) => {
          container.logger.warn(`Anti-spam timeout failed for ${author.id}: ${err}`);
          return false;
        })
      : false;

    await Promise.all(
      hits.map(async (h) => {
        const channel = guild.channels.cache.get(h.channelId);
        if (channel?.isTextBased()) await channel.messages.delete(h.messageId).catch(() => null);
      }),
    );

    author
      .send(
        `Your account just posted spam in **${guild.name}**, so it looks hacked. You've been timed out for now.\n` +
          "1. Change your Discord password (this logs out the attacker)\n" +
          "2. Turn on 2FA in User Settings → My Account\n" +
          "3. Check Authorized Apps and remove anything you don't recognise\n" +
          "Then message a mod and they'll lift the timeout.",
      )
      .catch(() => null);

    const channels = [...new Set(hits.map((h) => `<#${h.channelId}>`))].join(" ");
    const sample   = (message.content || "*(no text)*").slice(0, 1000);
    const files    = message.attachments.map((a) => a.name).join(", ");

    const embed = new EmbedBuilder()
      .setColor(ERROR_COLOR)
      .setTitle("🚨 Possible hacked account")
      .addFields(
        { name: "User",     value: `${author} — ${author.tag}`, inline: true },
        { name: "Action",   value: timedOut ? "Timed out 24h, messages deleted" : "⚠️ Could not time out — messages deleted", inline: true },
        { name: "Messages", value: `${hits.length} in ${channels}` },
        { name: "Sample",   value: sample },
      )
      .setTimestamp();
    if (files) embed.addFields({ name: "Attachments", value: files.slice(0, 1024) });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`${ANTISPAM_BUTTON_PREFIX}release:${author.id}`).setLabel("Release").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${ANTISPAM_BUTTON_PREFIX}ban:${author.id}`).setLabel("Ban").setStyle(ButtonStyle.Danger),
    );

    await sendLog(guild, "modActions", { embeds: [embed], components: [row] });
  },
};
