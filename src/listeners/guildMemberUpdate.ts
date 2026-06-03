import { Listener } from "@sapphire/framework";
import { Events, type GuildMember } from "discord.js";
import { UserRepository } from "../repositories/UserRepository";

export class GuildMemberUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberUpdate });
  }

  public async run(_oldMember: GuildMember, newMember: GuildMember) {
    try {
      await UserRepository.upsert(newMember);
    } catch (err) {
      this.container.logger.error(`GuildMemberUpdate error for ${newMember.id}: ${err}`);
    }
  }
}
