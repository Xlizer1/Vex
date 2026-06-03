import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../lib/config";

export class MusicChannelPrecondition extends Precondition {
  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!config.MUSIC_CHANNEL_ID) return this.ok();
    if (interaction.channelId === config.MUSIC_CHANNEL_ID) return this.ok();
    return this.error({
      message: `Music commands only work in <#${config.MUSIC_CHANNEL_ID}>.`,
    });
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    MusicChannel: never;
  }
}
