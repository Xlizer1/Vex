import { UserRepository } from "../repositories/UserRepository";
import { SteamResolutionError } from "../errors";
import { resolveSteamUrl } from "../lib/steam";

export const SteamService = {
  async link(userId: string, input: string): Promise<void> {
    const steamId = await resolveSteamUrl(input);
    if (!steamId) throw new SteamResolutionError();
    await UserRepository.updateSteamId(userId, steamId);
  },
};
