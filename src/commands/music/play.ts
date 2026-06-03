import { Command } from "@sapphire/framework";
import { EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { useMainPlayer } from "discord-player";
import { QUEUE_OPTIONS } from "../../lib/player";
import { replyError } from "../../lib/replyError";
import { BRAND_COLOR } from "../../constants";

const FOOTER = "The Vertex Music";

export class PlayCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, preconditions: ["MusicChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("play")
        .setDescription("Play a song or add it to the queue")
        .addStringOption((o) =>
          o.setName("query").setDescription("YouTube URL or search term").setRequired(true),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const query = interaction.options.getString("query", true);

    if (!(interaction.member instanceof GuildMember)) {
      return interaction.reply({ content: "Could not resolve your guild membership.", flags: MessageFlags.Ephemeral });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "You need to be in a voice channel to play music.", flags: MessageFlags.Ephemeral });
    }

    const botMember = interaction.guild?.members.me;
    if (botMember?.voice.channelId && botMember.voice.channelId !== voiceChannel.id) {
      return interaction.reply({ content: "I'm already playing in a different voice channel.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    try {
      const player = useMainPlayer();
      const result = await player.play(voiceChannel, query, {
        requestedBy: interaction.user,
        nodeOptions: { ...QUEUE_OPTIONS, metadata: interaction },
      });

      const track = result.track;
      const queue = result.queue;
      const isFirst = queue.tracks.size === 0 && queue.currentTrack === track;

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setThumbnail(track.thumbnail)
        .setFooter({ text: FOOTER });

      if (isFirst) {
        embed.setTitle("🎵 Now Playing").setDescription(`**[${track.title}](${track.url})**`);
      } else {
        const position = queue.tracks.size;
        embed
          .setTitle("➕ Added to Queue")
          .setDescription(`**[${track.title}](${track.url})**`)
          .addFields({ name: "Position", value: `#${position}`, inline: true });
      }

      embed.addFields(
        { name: "Duration",     value: track.duration,                         inline: true },
        { name: "Requested by", value: interaction.user.tag,                   inline: true },
      );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      this.container.logger.error(err);
      return replyError(interaction, "No results found or an error occurred. Try a different search term.");
    }
  }
}
