import { AutoModerationRuleKeywordPresetType, AutoModerationRuleTriggerType } from "discord.js";
import type { AutoModerationTriggerMetadataOptions } from "discord.js";

// ─── EDIT THIS FILE to tune AutoMod, then run /setup-automod ───
// Rules are matched by name (or by type for the one-per-server types), so re-running updates in place.
// Admins (Root, Domain Control) and bots are always exempt — that's Discord's rule, not ours.

export type AutomodRule = {
  name: string;
  triggerType: AutoModerationRuleTriggerType;
  triggerMetadata?: AutoModerationTriggerMetadataOptions;
  block?: boolean;         // stop the message from posting
  blockMessage?: string;   // shown to the sender, max 150 chars
  timeout?: boolean;       // only Keyword + MentionSpam rules allow this (Discord limit)
};

const HACKED_HINT = "Blocked: looks like a scam. If you didn't send this, your account is hacked — change your password + enable 2FA.";

export const AUTOMOD_RULES: AutomodRule[] = [
  {
    name: "Vex: Mention spam",
    triggerType: AutoModerationRuleTriggerType.MentionSpam,
    triggerMetadata: { mentionTotalLimit: 5, mentionRaidProtectionEnabled: true },
    block: true,
    blockMessage: HACKED_HINT,
    timeout: true,
  },
  {
    name: "Vex: Spam content",
    triggerType: AutoModerationRuleTriggerType.Spam,
    block: true,
  },
  {
    name: "Vex: Scam patterns",
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata: {
      keywordFilter: [
        "accidentally reported", "i accidentally reported you",
        "*steamcommunlty*", "*steamcomunity*", "*stearncommunity*",
        "*dlscord*", "*discorcl*", "*disc0rd*",
      ],
      // Rust regex. Avoid matching normal CS talk (skins, cases, trades).
      regexPatterns: [
        String.raw`\[[^\]]*\]\(\s*<?https?://`,             // masked link: [steamcommunity.com](https://evil)
        String.raw`(?i)@(everyone|here)[\s\S]*https?://`,   // mass ping + link
        String.raw`(?i)(free|gift|claim)\s*(discord\s*)?nitro`,
        String.raw`(?i)steam\s*(gift|wallet)\s*\$?\d+`,
      ],
    },
    block: true,
    blockMessage: HACKED_HINT,
    timeout: true,
  },
  {
    name: "Vex: Watch list",
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata: {
      keywordFilter: ["*airdrop*", "onlyfans", "*crypto giveaway*", "discord.gg/*", "discord.com/invite/*"],
    },
    // alert only — mods decide
  },
  {
    name: "Vex: Slurs",
    triggerType: AutoModerationRuleTriggerType.KeywordPreset,
    triggerMetadata: { presets: [AutoModerationRuleKeywordPresetType.Slurs] },
    // alert only — friends' banter is fine, slurs get a look
  },
];

// Discord allows only one rule of these types per server, so match an existing one by type.
export const SINGLETON_TRIGGERS = new Set([
  AutoModerationRuleTriggerType.Spam,
  AutoModerationRuleTriggerType.MentionSpam,
  AutoModerationRuleTriggerType.KeywordPreset,
  AutoModerationRuleTriggerType.MemberProfile,
]);
