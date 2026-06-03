import { config } from "./config";

const STEAM64_REGEX = /^7656119\d{10}$/;

export async function resolveSteamUrl(input: string): Promise<string | null> {
  const url = input.trim().replace(/\/$/, "");

  const profilesMatch = url.match(/steamcommunity\.com\/profiles\/(\d+)/);
  if (profilesMatch) {
    return STEAM64_REGEX.test(profilesMatch[1]!) ? profilesMatch[1]! : null;
  }

  const vanityMatch = url.match(/steamcommunity\.com\/id\/([^/]+)/);
  if (vanityMatch) {
    return resolveVanityUrl(vanityMatch[1]!);
  }

  if (STEAM64_REGEX.test(url)) return url;

  // treat anything else as a vanity name
  return resolveVanityUrl(url);
}

async function resolveVanityUrl(vanity: string): Promise<string | null> {
  if (!config.STEAM_API_KEY) return null;
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${config.STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanity)}`,
  ).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json() as { response?: { success: number; steamid?: string } };
  return data?.response?.success === 1 ? (data.response.steamid ?? null) : null;
}
