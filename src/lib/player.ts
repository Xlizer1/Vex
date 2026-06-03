import { Player } from "discord-player";
import { YoutubeiExtractor, objectToToken } from "discord-player-youtubei";
import type { SapphireClient } from "@sapphire/framework";
import { config } from "./config";
import { registerPlayerStart } from "./onPlayerStart";
import { registerPlayerError } from "./onPlayerError";

let _player: Player;

// leaveOnEmpty/End/Stop are per-queue options set in nodeOptions when calling player.play().
// The bot never auto-disconnects — 24/7 mode.
export const QUEUE_OPTIONS = {
  leaveOnEmpty:          false,
  leaveOnEmptyCooldown:  0,
  leaveOnEnd:            false,
  leaveOnEndCooldown:    0,
  leaveOnStop:           false,
  leaveOnStopCooldown:   0,
} as const;

export function initPlayer(client: SapphireClient): Player {
  _player = new Player(client as never, { skipFFmpeg: false });

  const authToken = config.YOUTUBE_ACCESS_TOKEN
    ? objectToToken({
        access_token:  config.YOUTUBE_ACCESS_TOKEN,
        refresh_token: config.YOUTUBE_REFRESH_TOKEN ?? "",
        expiry_date:   config.YOUTUBE_TOKEN_EXPIRY ?? "",
      })
    : "";

  _player.extractors.register(YoutubeiExtractor, {
    authentication: authToken,
  });

  registerPlayerStart(_player);
  registerPlayerError(_player);

  return _player;
}

export function getPlayer(): Player {
  if (!_player) throw new Error("[player] not initialized — call initPlayer() before login");
  return _player;
}
