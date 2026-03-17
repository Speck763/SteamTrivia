/**
 * SteamTrivia — Game Mode Definitions
 *
 * Each mode defines how questions are generated from player data.
 */

/**
 * Mode metadata for the config screen.
 */
export const MODES = [
  {
    id: 1,
    name: 'Solitario',
    icon: '🕹️',
    description: 'Adivina cuántas horas tenés en tus propios juegos.',
    minPlayers: 1,
    maxPlayers: 1,
    scoreType: 'proximity',
  },
  {
    id: 2,
    name: 'Multijugador',
    icon: '👥',
    description: 'Adivina las horas del otro jugador en sus juegos.',
    minPlayers: 2,
    maxPlayers: 10,
    scoreType: 'proximity',
  },
  {
    id: 3,
    name: '¿De quién es?',
    icon: '🏆',
    description: 'Se muestra un juego + horas. ¿A quién pertenece?',
    minPlayers: 3,
    maxPlayers: 10,
    scoreType: 'binary',
  },
];

/**
 * Get mode definition by ID.
 * @param {number} id
 * @returns {Object}
 */
export function getMode(id) {
  return MODES.find(m => m.id === id);
}
