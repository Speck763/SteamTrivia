/**
 * Vercel Serverless Function — Steam Profile
 *
 * Proxy to Steam Web API GetOwnedGames.
 * Filters games with < 1 hour and returns clean JSON.
 *
 * GET /api/steam-profile?steamid={STEAM_ID_64}
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { steamid } = req.query;

  if (!steamid || !/^\d{17}$/.test(steamid)) {
    return res.status(400).json({ error: 'Steam ID inválido. Debe ser un ID numérico de 17 dígitos.' });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'STEAM_API_KEY no configurada en el servidor.' });
  }

  try {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({ error: `Steam API respondió con status ${response.status}` });
    }

    const data = await response.json();
    const gamesRaw = data?.response?.games || [];

    // Filter games with less than 60 minutes (1 hour)
    const games = gamesRaw
      .filter(g => g.playtime_forever >= 60)
      .map(g => ({
        appid: g.appid,
        name: g.name,
        hours: Math.round((g.playtime_forever / 60) * 10) / 10, // Convert minutes to hours, 1 decimal
        image: `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
      }))
      .sort((a, b) => b.hours - a.hours);

    // Try to get username from Steam
    let username = null;
    try {
      const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamid}`;
      const summaryRes = await fetch(summaryUrl);
      const summaryData = await summaryRes.json();
      username = summaryData?.response?.players?.[0]?.personaname || null;
    } catch {
      // Non-critical, continue without username
    }

    return res.status(200).json({
      steamid,
      username: username || `User_${steamid.slice(-4)}`,
      game_count: games.length,
      games,
    });
  } catch (err) {
    return res.status(500).json({ error: `Error interno: ${err.message}` });
  }
}
