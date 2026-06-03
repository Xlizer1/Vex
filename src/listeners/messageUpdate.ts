import { Listener } from "@sapphire/framework";
import { EmbedBuilder, Events, type Message, type PartialMessage } from "discord.js";
import { sendAuditLog } from "../lib/auditLog";
import { BRAND_COLOR } from "../constants";

export class MessageUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageUpdate });
  }

  public async run(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (newMessage.author?.bot) return;
    if (!newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    try {
      const before = oldMessage.content || "*(not cached)*";
      const after  = newMessage.content || "*(not cached)*";

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("Message Edited")
        .addFields(
          { name: "Author",  value: `${newMessage.author ?? "Unknown"}`, inline: true },
          { name: "Channel", value: `<#${newMessage.channelId}>`,        inline: true },
          { name: "Before",  value: before.slice(0, 1024) || "*(empty)*" },
          { name: "After",   value: after.slice(0, 1024)  || "*(empty)*" },
        )
        .setURL(newMessage.url)
        .setFooter({ text: "Jump to message" })
        .setTimestamp();

      await sendAuditLog(newMessage.guild, embed);
    } catch (err) {
      this.container.logger.error(`MessageUpdate audit error: ${err}`);
    }
  }
}
