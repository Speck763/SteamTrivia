/**
 * Vite Dev Server Plugin — API Middleware
 *
 * Handles /api/* routes during local development so we don't need Vercel CLI.
 * In production, Vercel handles these routes with serverless functions.
 */

import { URL } from 'url';

const STEAM_API_BASE = 'https://api.steampowered.com';

/**
 * @returns {import('vite').Plugin}
 */
export default function steamApiPlugin() {
  return {
    name: 'steam-api-dev',
    configureServer(server) {
      // Handle /api/steam-profile
      server.middlewares.use('/api/steam-profile', async (req, res) => {
        const apiKey = process.env.STEAM_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'STEAM_API_KEY no configurada. Creá un archivo .env con STEAM_API_KEY=tu_clave' }));
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const steamid = url.searchParams.get('steamid');

        if (!steamid || !/^\d{17}$/.test(steamid)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Steam ID inválido. Debe ser un ID numérico de 17 dígitos.' }));
          return;
        }

        try {
          // Fetch owned games
          const gamesUrl = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true`;
          const gamesRes = await fetch(gamesUrl);

          if (!gamesRes.ok) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Steam API respondió con status ${gamesRes.status}` }));
            return;
          }

          const gamesData = await gamesRes.json();
          const gamesRaw = gamesData?.response?.games || [];

          // Filter games with < 60 minutes
          const games = gamesRaw
            .filter(g => g.playtime_forever >= 60)
            .map(g => ({
              appid: g.appid,
              name: g.name,
              hours: Math.round((g.playtime_forever / 60) * 10) / 10,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
            }))
            .sort((a, b) => b.hours - a.hours);

          // Fetch username
          let username = null;
          try {
            const summaryUrl = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamid}`;
            const summaryRes = await fetch(summaryUrl);
            const summaryData = await summaryRes.json();
            username = summaryData?.response?.players?.[0]?.personaname || null;
          } catch {
            // Non-critical
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            steamid,
            username: username || `User_${steamid.slice(-4)}`,
            game_count: games.length,
            games,
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Error interno: ${err.message}` }));
        }
      });
    },
  };
}
