import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";

const COMMANDS: Record<string, {
  description: string;
  usage: string;
  options?: string;
  notes?: string;
}> = {
  linksteam: {
    description:
      "Links your Steam account to your Discord profile. Once linked, your Steam64 ID is used by `/stats` and other CS2 commands. You only need to do this once — running it again updates the linked account.",
    usage: "/linksteam [profile_url]",
    options: "`profile_url` (text, optional) — Your Steam profile URL (e.g. `https://steamcommunity.com/id/yourname`), a Steam64 ID (`76561198...`), or just your vanity name (e.g. `xlizer`). Leave blank and the bot will send you a button to open your Steam profile directly.",
    notes:
      "Reply is only visible to you. If your profile URL uses a custom vanity name, a Steam API call is made to resolve it to a Steam64 ID. Profiles set to private on Steam cannot be resolved.",
  },
  stats: {
    description:
      "Displays a rich CS2 stats embed for yourself or another server member, pulled from Leetify. Shows Leetify ratings (Aim, Positioning, Utility), Premier rating, FACEIT level and ELO, headshot percentage, win rate, total matches played, and the last 3 matches with map, score, rating, and date.",
    usage: "/stats [user]",
    options: "`user` (mention, optional) — The server member to look up. Defaults to yourself if not provided.",
    notes:
      "The target must have linked their Steam account via `/linksteam` first. Their Leetify profile must be public — private profiles and accounts not registered on Leetify will return a graceful error. Stats are visible to everyone in the channel (not ephemeral), so you can share your stats publicly.",
  },
  rank: {
    description:
      "Self-assigns a CS2 Premier rating role from the 7 available tiers. Only one rank role can be held at a time — assigning a new tier automatically removes your previous one. Running the command with the tier you already have will remove the role (toggle off).",
    usage: "/rank <tier>",
    options:
      "`tier` (choice, required) — One of the 7 Premier rating ranges:\n`1,000–4,999` · `5,000–9,999` · `10,000–14,999` · `15,000–19,999` · `20,000–24,999` · `25,000–29,999` · `30,000+`",
    notes: "Requires an admin to have run `/setup-ranks` first to create the roles and panel. Reply is only visible to you.",
  },
  warn: {
    description:
      "Issues a formal warning to a server member. The warning is stored in the database with a case number, the member receives a DM explaining the reason, and the action is logged to #mod-logs.",
    usage: "/warn <user> <reason>",
    options:
      "`user` (mention, required) — The member to warn.\n`reason` (text, required) — The reason for the warning (shown in the DM and mod log).",
    notes: "Moderator only. Warnings are visible in `/infractions`.",
  },
  mute: {
    description:
      "Applies a Discord timeout to a member for a specified duration. The member cannot send messages, react, join voice channels, or interact with the server until the timeout expires. The action is stored as an infraction, the member is DM'd, and it is logged to #mod-logs.",
    usage: "/mute <user> <duration> <reason>",
    options:
      "`user` (mention, required) — The member to mute.\n`duration` (text, required) — How long to mute them. Format: a number followed by `m` (minutes), `h` (hours), `d` (days), or `w` (weeks). Examples: `30m`, `2h`, `7d`, `1w`. Maximum is 28 days.\n`reason` (text, required) — The reason for the mute.",
    notes: "Moderator only. The timeout is enforced natively by Discord — even if the bot goes offline it will expire correctly.",
  },
  kick: {
    description:
      "Kicks a member from the server. They are removed immediately but can rejoin with an invite. The action is stored as an infraction, the member is DM'd before being kicked, and it is logged to #mod-logs.",
    usage: "/kick <user> <reason>",
    options:
      "`user` (mention, required) — The member to kick.\n`reason` (text, required) — The reason for the kick.",
    notes: "Moderator only. Kicked members can rejoin via invite. Use `/ban` if you want to prevent re-entry.",
  },
  ban: {
    description:
      "Bans a member from the server. They are removed and blocked from rejoining. Optionally, you can set a duration for a temporary ban and choose to delete their recent messages. The action is stored as an infraction, the member is DM'd before being banned, and it is logged to #mod-logs.",
    usage: "/ban <user> <reason> [duration] [delete_days]",
    options:
      "`user` (mention, required) — The member to ban.\n`reason` (text, required) — The reason for the ban.\n`duration` (text, optional) — How long to ban them. Same format as `/mute` (e.g. `7d`, `1w`). Omit for a permanent ban.\n`delete_days` (number, optional) — Number of days of messages to delete (0–7, default 0).",
    notes: "Moderator only. Permanent bans have no expiry. Temporary bans must be manually unbanned via Discord — the bot does not auto-unban yet.",
  },
  infractions: {
    description:
      "Shows the full moderation history for a user — all warnings, mutes, kicks, and bans they have received on this server. Each entry shows the case number, action type, reason, moderating officer, and timestamp.",
    usage: "/infractions <user> [page]",
    options:
      "`user` (mention, required) — The member to look up.\n`page` (number, optional) — Page number for pagination (5 infractions per page, default 1).",
    notes: "Moderator only. Reply is only visible to you.",
  },
  "setup-ranks": {
    description:
      "Creates the 7 CS2 Premier rating roles if they don't already exist, then posts an interactive button panel in the current channel. Members can click a button to self-assign their rank role. Only one rank role can be held at a time.",
    usage: "/setup-ranks",
    notes:
      "Admin only. Run this command in the channel where you want the permanent rank panel to live. Roles that already exist will not be duplicated. The panel message stays in the channel indefinitely — members interact with it at any time.",
  },
  "setup-faceit": {
    description:
      "Creates roles for FACEIT Levels 1–10 if they don't already exist, then posts an interactive button panel in the current channel. Members can click a button to self-assign their FACEIT level role.",
    usage: "/setup-faceit",
    notes: "Admin only. Same behavior as `/setup-ranks` but for FACEIT levels instead of Premier rating.",
  },
  ping: {
    description: "Checks that the bot is alive and measures its current latency.",
    usage: "/ping",
    notes: "Shows two values: roundtrip latency (time between sending the command and the bot responding) and WebSocket heartbeat (the live connection latency to Discord's gateway).",
  },
  help: {
    description: "Shows the full command reference. Use without an argument for an overview of all commands, or specify a command name for detailed usage instructions.",
    usage: "/help [command]",
    options: "`command` (choice, optional) — The name of a command to get detailed help for.",
  },
};

const OVERVIEW_FIELDS = [
  {
    name: "CS2",
    value: "`/linksteam` — Link your Steam account\n`/stats` — View CS2 stats from Leetify\n`/rank` — Self-assign a CS2 Premier rating role",
  },
  {
    name: "Moderation  🔒 Moderator only",
    value:
      "`/warn` — Issue a warning to a member\n`/mute` — Timeout a member\n`/kick` — Kick a member from the server\n`/ban` — Ban a member from the server\n`/infractions` — View a user's infraction history",
  },
  {
    name: "Setup  ⚙️ Admin only",
    value: "`/setup-ranks` — Create CS2 rating roles and post the selection panel\n`/setup-faceit` — Create FACEIT level roles and post the selection panel",
  },
  {
    name: "Utilities",
    value: "`/ping` — Check bot latency\n`/help` — Show this help message",
  },
];

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("help")
        .setDescription("View command reference or get detailed help for a specific command")
        .addStringOption((o) =>
          o
            .setName("command")
            .setDescription("Command to get detailed help for")
            .setRequired(false)
            .addChoices(
              Object.keys(COMMANDS).map((name) => ({ name, value: name })),
            ),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command");

    if (!commandName) {
      const embed = new EmbedBuilder()
        .setColor(0xef9f27)
        .setTitle("Vex — Command Reference")
        .setDescription("Use `/help command:<name>` for detailed usage on any command.")
        .addFields(OVERVIEW_FIELDS)
        .setFooter({ text: "The Vertex  •  Hold the angle." });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const cmd = COMMANDS[commandName];
    if (!cmd) {
      return interaction.reply({ content: "Unknown command.", flags: MessageFlags.Ephemeral });
    }

    const fields: { name: string; value: string }[] = [
      { name: "Description", value: cmd.description },
      { name: "Usage", value: `\`${cmd.usage}\`` },
    ];

    if (cmd.options) {
      fields.push({ name: "Options", value: cmd.options });
    }

    if (cmd.notes) {
      fields.push({ name: "Notes", value: cmd.notes });
    }

    const embed = new EmbedBuilder()
      .setColor(0xef9f27)
      .setTitle(`/${commandName}`)
      .addFields(fields)
      .setFooter({ text: "The Vertex  •  Hold the angle." });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
