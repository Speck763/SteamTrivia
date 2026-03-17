# 🎮 SteamTrivia — Game Design Document

## Descripción general

Aplicación web interactiva tipo trivia que usa datos públicos de Steam para crear un juego entre amigos. Los jugadores ingresan perfiles de Steam y el sistema genera preguntas basadas en los juegos y horas jugadas de esos perfiles.

---

## Modos de juego

### 🕹️ Modo 1 — Solitario (Adivinanza de horas)

- **Jugadores**: 1 (se scrappea su propio perfil de Steam)
- **Mecánica**: Se muestra un juego al azar del jugador. Debe adivinar cuántas horas tiene en ese juego.
- **Puntuación**: Por proximidad al número exacto (estilo GeoGuessr).
  - Exacto → puntuación máxima
  - Cuanto más lejos, menos puntos

---

### 👥 Modo 2 — Multijugador (Adivinanza de horas del otro)

- **Jugadores**: 2 o más (cada uno ingresa su Steam ID)
- **Mecánica**: Se muestra el **nombre de usuario de Steam** y un juego que ese usuario jugó. El jugador en turno debe adivinar cuántas horas tiene ese usuario en ese juego.
- **Turno por turno**: cada jugador responde desde el mismo dispositivo.
- **Puntuación**: Por proximidad (igual que Modo 1).

> ⚠️ No se muestran las horas, se muestra el juego y el nombre de usuario.

---

### 🏆 Modo 3 — ¿De quién es? (3 o más jugadores)

- **Jugadores**: 3 o más (se ingresan múltiples Steam IDs)
- **Mecánica**: Se muestra un juego + horas jugadas, y el jugador debe adivinar **a qué usuario pertenece** ese registro.
  - Opciones: todos los usuarios ingresados (estilo Preguntados)
- **Puntuación**: Entera. +1 por respuesta correcta, 0 por incorrecta.

> ⚠️ Aquí sí se muestran las horas exactas (son el dato clave para adivinar al usuario).

---

## Reglas comunes

- Se excluyen juegos con **menos de 1 hora jugada**.
- No se repite la misma combinación usuario + juego en la misma partida.
- Los nombres de los juegos se muestran tal cual vienen de Steam (sin traducción).
- Se muestra la **portada del juego** (imagen desde la API de Steam) en todos los modos.

---

## Configuración previa a la partida

| Parámetro | Descripción |
|---|---|
| Steam IDs / usernames | IDs o nombres de usuario de Steam a incluir |
| Modo de juego | Solitario / Multijugador / ¿De quién es? |
| Número de preguntas | Elegido por el jugador |

---

## Flujo del sistema

```
1. El jugador configura la partida (IDs, modo, cantidad de preguntas)
2. El backend consulta la Steam Web API por cada ID ingresado
3. Se construye una base de datos temporal: { usuario, juego, horas, portada }
4. Se generan preguntas aleatorias según el modo elegido
5. El jugador responde turno por turno
6. Al finalizar, se muestra puntuación total y porcentaje de aciertos
```

---

## Arquitectura técnica

### Frontend
- Interfaz web (HTML + CSS + JS o framework liviano)
- Pantalla de configuración
- Pantalla de pregunta
- Pantalla de resultados
- Imágenes de portada de juegos

### Backend
- Consulta a la Steam Web API
- Procesamiento y filtrado de datos
- Generación de preguntas aleatorias
- Cálculo de puntuación

### Deploy
- Target: **Vercel** (o similar, serverless/liviano)

---

## API de Steam

### Estrategia actual — Opción B (Key centralizada)

Se usa una única **Steam Web API Key** propia de la app para consultar los perfiles de todos los usuarios.

- **Endpoint principal**:
  ```
  GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/
    ?key={API_KEY}&steamid={STEAM_ID}&include_appinfo=true
  ```
- Devuelve: lista de juegos, horas jugadas, nombre del juego e imagen de portada.
- **Límite**: 100.000 requests/día (cada partida consume ~3–5 requests).
- **Requisito**: los perfiles de Steam deben ser **públicos**.

> [!NOTE]
> Para un minijuego de uso entre amigos, el rate limit de Steam es más que suficiente. No se persisten datos entre sesiones; cada partida recarga todo desde Steam.

---

## Escalabilidad futura

> [!TIP]
> **Opción A — API Key por usuario**: Si la app escala masivamente y el rate limit de la key centralizada se convierte en un problema, se puede agregar un paso de onboarding donde cada usuario genera y provee su propia Steam API Key en [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey). Esto distribuye el consumo y elimina el límite centralizado.

---

## Mejoras futuras (post-MVP)

- [ ] Modo multijugador en tiempo real (cada jugador desde su propio dispositivo)
- [ ] Temporizador por pregunta
- [ ] Ranking de puntuaciones
- [ ] Versión como bot/app de Discord
- [ ] Caché de perfiles para evitar re-consultar la API en partidas consecutivas
