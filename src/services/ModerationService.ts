import { container } from "@sapphire/framework";
import type { Guild, GuildMember, User } from "discord.js";
import { InfractionRepository } from "../repositories/InfractionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { sendModLog } from "../lib/modLog";
import { parseDuration } from "../lib/parseDuration";
import type { Infraction } from "../db/schema";
import { INFRACTIONS_PAGE_SIZE } from "../constants";

export interface PaginatedInfractions {
  records: Infraction[];
  total: number;
  page: number;
  totalPages: number;
}

export const ModerationService = {
  async warn(guild: Guild, target: User, moderator: User, reason: string): Promise<Infraction> {
    await UserRepository.upsertFromUser(target);
    await UserRepository.upsertFromUser(moderator);

    const infraction = await InfractionRepository.create({
      userId: target.id,
      moderatorId: moderator.id,
      type: "warn",
      reason,
    });

    target
      .send(`You have been warned in **The Vertex**: ${reason}`)
      .catch((err) => container.logger.warn(`Failed to DM warn to ${target.id}: ${err}`));

    await sendModLog(guild, infraction, target, moderator);
    return infraction;
  },

  async mute(
    guild: Guild,
    target: User,
    member: GuildMember,
    moderator: User,
    durationStr: string,
    reason: string,
  ): Promise<Infraction> {
    const minutes = parseDuration(durationStr);
    if (!minutes) throw new Error(`Invalid duration: ${durationStr}`);

    const expiresAt = new Date(Date.now() + minutes * 60_000);

    await UserRepository.upsertFromUser(target);
    await UserRepository.upsertFromUser(moderator);

    const infraction = await InfractionRepository.create({
      userId: target.id,
      moderatorId: moderator.id,
      type: "mute",
      reason,
      duration: minutes,
      expiresAt,
    });

    await member.timeout(minutes * 60_000, reason);

    target
      .send(`You have been muted in **The Vertex** for ${durationStr}: ${reason}`)
      .catch((err) => container.logger.warn(`Failed to DM mute to ${target.id}: ${err}`));

    await sendModLog(guild, infraction, target, moderator);
    return infraction;
  },

  async kick(
    guild: Guild,
    target: User,
    member: GuildMember,
    moderator: User,
    reason: string,
  ): Promise<Infraction> {
    await UserRepository.upsertFromUser(target);
    await UserRepository.upsertFromUser(moderator);

    const infraction = await InfractionRepository.create({
      userId: target.id,
      moderatorId: moderator.id,
      type: "kick",
      reason,
    });

    target
      .send(`You have been kicked from **The Vertex**: ${reason}`)
      .catch((err) => container.logger.warn(`Failed to DM kick to ${target.id}: ${err}`));

    await member.kick(reason);
    await sendModLog(guild, infraction, target, moderator);
    return infraction;
  },

  async ban(
    guild: Guild,
    target: User,
    moderator: User,
    reason: string,
    durationStr?: string | null,
    deleteDays = 0,
  ): Promise<Infraction> {
    const minutes = durationStr ? parseDuration(durationStr) : null;
    const expiresAt = minutes ? new Date(Date.now() + minutes * 60_000) : null;

    await UserRepository.upsertFromUser(target);
    await UserRepository.upsertFromUser(moderator);

    const infraction = await InfractionRepository.create({
      userId: target.id,
      moderatorId: moderator.id,
      type: "ban",
      reason,
      duration: minutes ?? null,
      expiresAt,
    });

    const durationLabel = minutes ? ` for ${durationStr}` : " permanently";
    target
      .send(`You have been banned from **The Vertex**${durationLabel}: ${reason}`)
      .catch((err) => container.logger.warn(`Failed to DM ban to ${target.id}: ${err}`));

    await guild.members.ban(target, { reason, deleteMessageDays: deleteDays });
    await sendModLog(guild, infraction, target, moderator);
    return infraction;
  },

  async getInfractions(userId: string, page: number): Promise<PaginatedInfractions> {
    const { records, total } = await InfractionRepository.findByUser(userId, page);
    const totalPages = Math.max(1, Math.ceil(total / INFRACTIONS_PAGE_SIZE));
    return { records, total, page, totalPages };
  },
};
