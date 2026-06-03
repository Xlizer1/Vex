import { Listener } from "@sapphire/framework";
import { Events, type Client } from "discord.js";
import { startVoiceFragPoller } from "../lib/voiceFragPoller";

export class ReadyListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, once: true, event: Events.ClientReady });
  }

  public run(client: Client) {
    const { username, id } = client.user!;
    this.container.logger.info(`Successfully logged in as ${username} (${id})`);
    startVoiceFragPoller(this.container.client);
  }
}
