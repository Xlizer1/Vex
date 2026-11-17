export const BRAND_COLOR = 0xef9f27;
export const ERROR_COLOR  = 0xe24b4a;

export const FRAGS_PER_MESSAGE        = 5;
export const FRAGS_PER_VOICE_MINUTE   = 5;
export const MESSAGE_FRAG_COOLDOWN_MS = 60_000;
export const VOICE_POLL_INTERVAL_MS   = 60_000;
export const DAILY_FRAGS              = 500;
export const DAILY_COOLDOWN_MS        = 24 * 60 * 60 * 1_000;
export const FLIP_CHALLENGE_TTL_MS    = 5 * 60 * 1_000;

export const RECENT_MATCHES_COUNT  = 3;
export const INFRACTIONS_PAGE_SIZE = 5;
export const MAX_TIMEOUT_DAYS      = 28;
export const AUDIT_LOG_GRACE_MS    = 1_500;
export const AUDIT_LOG_RECENCY_MS  = 5_000;
export const UNIX_SECOND_MS        = 1_000;

// Anti-spam (hacked accounts): same message in N channels, or a burst of links/attachments
export const SPAM_WINDOW_MS          = 30_000;
export const SPAM_CHANNEL_THRESHOLD  = 3;
export const SPAM_MEDIA_WINDOW_MS    = 10_000;
export const SPAM_MEDIA_THRESHOLD    = 5;
export const SPAM_TIMEOUT_MS         = 24 * 60 * 60 * 1_000;
export const AUTOMOD_TIMEOUT_SECONDS = 60 * 60;
