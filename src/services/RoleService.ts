import type { Guild, GuildMember } from "discord.js";
import { RoleNotFoundError } from "../errors";

export const RoleService = {
  async assignRole(
    member: GuildMember,
    guild: Guild,
    targetRoleName: string,
    allRoleNames: string[],
  ): Promise<"added" | "removed"> {
    await guild.roles.fetch();

    const allRoles = allRoleNames
      .map((name) => guild.roles.cache.find((r) => r.name === name))
      .filter(Boolean);

    const targetRole = allRoles.find((r) => r!.name === targetRoleName);
    if (!targetRole) throw new RoleNotFoundError(targetRoleName);

    const otherRoles = member.roles.cache.filter(
      (r) => allRoles.some((ar) => ar!.id === r.id) && r.id !== targetRole.id,
    );
    if (otherRoles.size > 0) await member.roles.remove(otherRoles);

    if (member.roles.cache.has(targetRole.id)) {
      await member.roles.remove(targetRole.id);
      return "removed";
    }

    await member.roles.add(targetRole.id);
    return "added";
  },
};
