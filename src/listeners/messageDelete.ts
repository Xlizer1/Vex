import { Listener } from "@sapphire/framework";
import { EmbedBuilder, Events, type Message, type PartialMessage } from "discord.js";
import { sendAuditLog } from "../lib/auditLog";
import { ERROR_COLOR } from "../constants";

export class MessageDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageDelete });
  }

  public async run(message: Message | PartialMessage) {
    if (message.author?.bot) return;
    if (!message.guild) return;

    try {
      const content = message.content || "*(not cached)*";
      const author  = message.author
        ? `${message.author} — ${message.author.tag}`
        : "*(not cached)*";

      const embed = new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setTitle("Message Deleted")
        .addFields(
          { name: "Author",  value: author,                             inline: true },
          { name: "Channel", value: `<#${message.channelId}>`,         inline: true },
          { name: "Content", value: content.slice(0, 1024) || "*(empty)*" },
        )
        .setTimestamp();

      if (message.attachments?.size) {
        const names = message.attachments.map((a) => a.name ?? "unknown").join(", ");
        embed.addFields({ name: "Attachments", value: names });
      }

      await sendAuditLog(message.guild, embed);
    } catch (err) {
      this.container.logger.error(`MessageDelete audit error: ${err}`);
    }
  }
}
