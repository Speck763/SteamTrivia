# 🏗️ SteamTrivia — Arquitectura Técnica

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | Vanilla JS + HTML + CSS | Bundle mínimo (~10KB), sin overhead de frameworks |
| **Bundler** | Vite 6.x | Build rápido, HMR, zero-config para vanilla JS |
| **Backend** | Vercel Serverless Functions (Node.js) | Proxy seguro a Steam API, sin servidor 24/7 |
| **Deploy** | Vercel (free tier) | CDN global, dominio `.vercel.app` gratuito |
| **API externa** | Steam Web API | Datos de juegos, horas y perfiles |

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (Cliente)                │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Config      │→│  Pregunta     │→│ Resultados │  │
│  │  Screen      │  │  Screen      │  │ Screen     │  │
│  └──────┬───────┘  └──────────────┘  └───────────┘  │
│         │                                           │
│  ┌──────┴───────────────────────────────────────┐   │
│  │            Game Engine (en memoria)           │   │
│  │  • Genera preguntas aleatorias                │   │
│  │  • Controla turnos                            │   │
│  │  • Calcula puntuación                         │   │
│  └──────┬───────────────────────────────────────┘   │
│         │ fetch()                                   │
└─────────┼───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              VERCEL (Serverless Edge)                │
│                                                     │
│  ┌────────────────────┐  ┌───────────────────────┐  │
│  │ /api/steam-profile  │  │ /api/resolve-vanity   │  │
│  │                    │  │                       │  │
│  │ Recibe: steamid    │  │ Recibe: vanityurl     │  │
│  │ Devuelve: juegos[] │  │ Devuelve: steamid     │  │
│  │ + horas + imágenes │  │ numérico              │  │
│  └────────┬───────────┘  └───────────┬───────────┘  │
│           │  STEAM_API_KEY (env var)  │              │
└───────────┼───────────────────────────┼──────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────────┐
│                  STEAM WEB API                      │
│                                                     │
│  GET /IPlayerService/GetOwnedGames/v1/              │
│  GET /ISteamUser/ResolveVanityURL/v1/               │
│                                                     │
│  Rate limit: 100,000 req/día                        │
└─────────────────────────────────────────────────────┘
```

---

## Estructura de Carpetas

```
juegito steam/
├── index.html                  # Entry point HTML
├── vite.config.js              # Configuración de Vite
├── package.json                # Solo 1 devDependency: vite
│
├── src/
│   ├── main.js                 # Bootstrap de la app
│   ├── router.js               # Navegación SPA (hash-based)
│   │
│   ├── screens/
│   │   ├── config.js           # Pantalla: ingresar Steam IDs, elegir modo
│   │   ├── question.js         # Pantalla: mostrar pregunta + input
│   │   └── results.js          # Pantalla: puntuación final
│   │
│   ├── game/
│   │   ├── engine.js           # Motor del juego: generar preguntas, turnos
│   │   ├── scoring.js          # Cálculo de puntuación por proximidad
│   │   └── modes.js            # Reglas específicas de cada modo
│   │
│   ├── api/
│   │   └── steam.js            # Cliente HTTP → /api/* (fetch wrapper)
│   │
│   └── styles/
│       ├── main.css            # Variables CSS, reset, layout global
│       ├── components.css      # Botones, cards, inputs, badges
│       └── animations.css      # Transiciones y micro-animaciones
│
├── api/                        # ⚡ Vercel Serverless Functions
│   ├── steam-profile.js        # Proxy → GetOwnedGames
│   └── resolve-vanity.js       # Proxy → ResolveVanityURL
│
├── public/
│   └── favicon.ico
│
├── game-design-doc.md          # GDD
└── architecture.md             # Este archivo
```

---

## Endpoints del Backend

### `GET /api/steam-profile?steamid={ID}`

Proxy seguro a la Steam Web API. Oculta la API Key del cliente.

**Request:**
```
GET /api/steam-profile?steamid=76561197960287930
```

**Lógica interna:**
```
1. Recibe steamid del query string
2. Llama a Steam API: GetOwnedGames/v1/?key={ENV}&steamid={ID}&include_appinfo=true
3. Filtra juegos con < 1 hora (playtime_forever < 60 minutos)
4. Mapea a formato limpio: { appid, name, hours, image }
5. Devuelve JSON
```

**Response:**
```json
{
  "steamid": "76561197960287930",
  "game_count": 42,
  "games": [
    {
      "appid": 730,
      "name": "Counter-Strike 2",
      "hours": 1523.4,
      "image": "https://media.steampowered.com/steamcommunity/public/images/apps/730/..."
    }
  ]
}
```

---

### `GET /api/resolve-vanity?vanityurl={nombre}`

Resuelve un nombre personalizado de Steam al Steam ID numérico.

**Request:**
```
GET /api/resolve-vanity?vanityurl=gaben
```

**Lógica interna:**
```
1. Recibe vanityurl del query string
2. Llama a Steam API: ResolveVanityURL/v1/?key={ENV}&vanityurl={nombre}
3. Si success=1, devuelve el steamid
4. Si success≠1, devuelve error 404
```

**Response (éxito):**
```json
{
  "steamid": "76561197960287930",
  "success": true
}
```

**Response (error):**
```json
{
  "error": "Perfil no encontrado",
  "success": false
}
```

---

## Flujo de Datos Completo

```
┌──────────────────────────────────────────────────────────────┐
│                        FLUJO DE UNA PARTIDA                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CONFIGURACIÓN                                            │
│     Usuario escribe: "gaben" o "76561197960287930"           │
│     │                                                        │
│     ├─ Si es texto → fetch /api/resolve-vanity?vanityurl=... │
│     │                → obtiene Steam ID numérico             │
│     │                                                        │
│     └─ fetch /api/steam-profile?steamid=7656119...           │
│        → obtiene lista de juegos + horas                     │
│                                                              │
│  2. GENERACIÓN DE PREGUNTAS (100% en cliente)                │
│     │                                                        │
│     ├─ Modo 1 (Solitario):                                   │
│     │  Pregunta = { juego: "CS2", respuesta: 1523 horas }    │
│     │                                                        │
│     ├─ Modo 2 (Multijugador):                                │
│     │  Pregunta = { usuario: "gaben", juego: "CS2",          │
│     │               respuesta: 1523 horas }                  │
│     │                                                        │
│     └─ Modo 3 (¿De quién es?):                               │
│        Pregunta = { juego: "CS2", horas: 1523,               │
│                     opciones: ["gaben","user2","user3"],      │
│                     respuesta: "gaben" }                     │
│                                                              │
│  3. GAMEPLAY (100% en cliente, sin network)                   │
│     Jugador responde → se calcula puntuación → siguiente     │
│                                                              │
│  4. RESULTADOS (100% en cliente)                              │
│     Se muestra puntuación total + desglose por pregunta      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos (en memoria del cliente)

```js
// Estado global del juego — vive en una variable JS, no en DB
const gameState = {
  mode: 1 | 2 | 3,
  players: [
    {
      steamid: "76561197960287930",
      username: "gaben",
      games: [
        { appid: 730, name: "Counter-Strike 2", hours: 1523.4, image: "https://..." },
        // ...
      ]
    }
  ],
  questions: [
    {
      game: { appid, name, hours, image },
      player: { steamid, username },        // Modo 2 y 3
      options: ["gaben", "user2", "user3"],  // Solo Modo 3
      type: "guess_hours" | "guess_owner",
      answered: false,
      playerAnswer: null,
      score: 0
    }
  ],
  currentQuestion: 0,
  currentPlayerTurn: 0,  // Para turnos en multijugador
  scores: { "gaben": 0, "user2": 0 }
};
```

---

## Puntuación — Algoritmo de Proximidad

Usado en **Modo 1** y **Modo 2** (adivinar horas):

```js
// Estilo GeoGuessr: puntuación máxima 1000, decrece con la distancia
function calculateScore(guess, actual) {
  const maxScore = 1000;
  const diff = Math.abs(guess - actual);
  const tolerance = actual * 0.5; // 50% del valor real como referencia

  if (diff === 0) return maxScore;

  // Decrecimiento exponencial
  const score = maxScore * Math.exp(-3 * (diff / Math.max(tolerance, 1)));
  return Math.round(Math.max(score, 0));
}
```

| Horas reales | Respuesta | Diferencia | Puntuación |
|---|---|---|---|
| 100 | 100 | 0 | 1000 |
| 100 | 90 | 10 | ~548 |
| 100 | 50 | 50 | ~50 |
| 100 | 200 | 100 | ~2 |

**Modo 3** (¿de quién es?): puntuación binaria — **+1 correcto, +0 incorrecto**.

---

## Seguridad

| Riesgo | Mitigación |
|---|---|
| Exposición de API Key | Key guardada como `STEAM_API_KEY` en variables de entorno de Vercel, nunca en código frontend |
| Abuso de endpoints | Rate limiting en Vercel (100 req/10s por IP por defecto) |
| Steam IDs inválidos | Validación en serverless function antes de llamar a Steam |
| XSS en nombres de usuario | Escapar HTML al renderizar nombres de Steam |

---

## Dependencias

```json
{
  "devDependencies": {
    "vite": "^6.x"
  }
}
```

**Cero dependencias de producción.** Todo el código de la app es vanilla JS.

---

## Estimación de Peso Final

| Recurso | Tamaño (gzipped) |
|---|---|
| JS bundle | ~5–8 KB |
| CSS | ~2–3 KB |
| HTML | ~1 KB |
| **Total (sin imágenes)** | **~10 KB** |
| Imágenes de juegos | Servidas desde CDN de Steam (no cuentan en nuestro bundle) |
