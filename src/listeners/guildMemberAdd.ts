import { Listener } from "@sapphire/framework";
import { EmbedBuilder, Events, TextChannel, type GuildMember } from "discord.js";
import { config } from "../lib/config";
import { UserRepository } from "../repositories/UserRepository";
import { sendAuditLog } from "../lib/auditLog";
import { BRAND_COLOR, UNIX_SECOND_MS } from "../constants";

export class GuildMemberAddListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberAdd });
  }

  public async run(member: GuildMember) {
    try {
      await Promise.all([
        UserRepository.upsert(member),
        member.roles.add(config.EDGE_ROLE_ID),
      ]);

      const channel = await member.client.channels.fetch(config.WELCOME_CHANNEL_ID).catch(() => null);
      if (channel instanceof TextChannel) {
        await channel.send(`Welcome to the server, ${member}!`).catch((err) =>
          this.container.logger.warn(`Failed to send welcome message: ${err}`),
        );
      }

      const ts = Math.floor(member.user.createdTimestamp / UNIX_SECOND_MS);
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("Member Joined")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${member} — ${member.user.tag}`, inline: true },
          { name: "Account Created", value: `<t:${ts}:R>`, inline: true },
        )
        .setTimestamp();

      await sendAuditLog(member.guild, embed);
    } catch (err) {
      this.container.logger.error(`GuildMemberAdd error for ${member.id}: ${err}`);
    }
  }
}
