import { Precondition } from "@sapphire/framework";
import { type ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";

export class AdminOnlyPrecondition extends Precondition {
  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return this.ok();
    }
    return this.error({ message: "You need Administrator permission to use this command." });
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    AdminOnly: never;
  }
}
