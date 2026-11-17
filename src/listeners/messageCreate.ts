import { Listener } from "@sapphire/framework";
import { Events, type Message } from "discord.js";
import { FragService } from "../services/FragService";
import { UserRepository } from "../repositories/UserRepository";
import { AntiSpamService } from "../services/AntiSpamService";

export class MessageCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageCreate });
  }

  public async run(message: Message) {
    if (message.author.bot || !message.inGuild()) return;

    try {
      if (await AntiSpamService.check(message)) return; // no frags for spam
    } catch (err) {
      this.container.logger.error(`Anti-spam error for ${message.author.id}: ${err}`);
    }

    try {
      await UserRepository.upsertFromUser(message.author);
      await FragService.awardMessageFrags(message.author.id);
    } catch (err) {
      this.container.logger.error(`MessageCreate frag award error for ${message.author.id}: ${err}`);
    }
  }
}
