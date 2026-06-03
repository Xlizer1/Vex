import { Listener } from "@sapphire/framework";
import { EmbedBuilder, Events, type GuildMember } from "discord.js";
import { UserRepository } from "../repositories/UserRepository";
import { sendAuditLog } from "../lib/auditLog";
import { ERROR_COLOR } from "../constants";

export class GuildMemberRemoveListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberRemove });
  }

  public async run(member: GuildMember) {
    try {
      await UserRepository.setInactive(member.id);

      const roles = member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .map((r) => `<@&${r.id}>`)
        .join(", ") || "None";

      const embed = new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setTitle("Member Left")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
          { name: "Roles", value: roles },
        )
        .setTimestamp();

      await sendAuditLog(member.guild, embed);
    } catch (err) {
      this.container.logger.error(`GuildMemberRemove error for ${member.id}: ${err}`);
    }
  }
}
