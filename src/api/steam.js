/**
 * SteamTrivia — Steam API Client
 * Calls our serverless backend endpoints (never calls Steam directly from browser).
 */

const API_BASE = '/api';

// Offset to convert friend codes to Steam ID 64
const STEAM_ID_64_OFFSET = 76561197960265728n;

/**
 * Fetch a Steam profile's games.
 * @param {string} steamid - Numeric Steam ID (64-bit)
 * @returns {Promise<{steamid: string, game_count: number, games: Array}>}
 */
export async function fetchSteamProfile(steamid) {
  const res = await fetch(`${API_BASE}/steam-profile?steamid=${encodeURIComponent(steamid)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error al obtener perfil (${res.status})`);
  }

  return res.json();
}

/**
 * Smart resolve: accepts a friend code, Steam ID 64, or profile URL.
 *
 * @param {string} input - Friend code, Steam ID 64, or full profile URL
 * @returns {string} - Numeric Steam ID 64
 */
export function resolveInput(input) {
  const trimmed = input.trim();

  // Full URL: extract the numeric ID
  // e.g. https://steamcommunity.com/profiles/765611... → "765611..."
  const urlMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Numeric: could be Steam ID 64 (17 digits) or Friend Code (shorter)
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length === 17) {
      return trimmed; // Already a Steam ID 64
    }
    // Friend Code → convert to Steam ID 64
    const friendCode = BigInt(trimmed);
    const steamId64 = (friendCode + STEAM_ID_64_OFFSET).toString();
    return steamId64;
  }

  throw new Error('Ingresá un ID de amigo numérico o un link de perfil de Steam.');
}

/**
 * Build full image URL for a Steam game header.
 * @param {number} appid
 * @returns {string}
 */
export function getGameImageURL(appid) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
}
