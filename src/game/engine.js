/**
 * SteamTrivia — Game Engine
 *
 * Generates questions from player data and manages game state.
 * Runs entirely in the client — no network calls during gameplay.
 */

import { getMode } from './modes.js';

/**
 * Shuffle an array in-place (Fisher-Yates).
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick N random items from an array (without mutating).
 */
function pickRandom(arr, n) {
  return shuffle([...arr]).slice(0, n);
}

/**
 * Generate questions based on mode and player data.
 *
 * @param {Object} params
 * @param {number} params.mode - Game mode (1, 2, or 3)
 * @param {Array} params.players - Array of { steamid, username, games[] }
 * @param {number} params.questionCount - Number of questions to generate
 * @returns {Array} Array of question objects
 */
export function generateQuestions({ mode, players, questionCount }) {
  switch (mode) {
    case 1: return generateMode1(players, questionCount);
    case 2: return generateMode2(players, questionCount);
    case 3: return generateMode3(players, questionCount);
    default: throw new Error(`Modo desconocido: ${mode}`);
  }
}

/**
 * Mode 1 — Solo: Guess your own hours.
 * One player, show a game, guess the hours.
 */
function generateMode1(players, count) {
  const player = players[0];
  const pool = player.games.map(g => ({
    type: 'guess_hours',
    game: g,
    player: { steamid: player.steamid, username: player.username },
    answer: g.hours,
    answered: false,
    playerAnswer: null,
    score: 0,
  }));

  return pickRandom(pool, Math.min(count, pool.length));
}

/**
 * Mode 2 — Multiplayer: Guess another player's hours.
 * Show a player name + game, guess their hours.
 */
function generateMode2(players, count) {
  const pool = [];
  for (const player of players) {
    for (const game of player.games) {
      pool.push({
        type: 'guess_hours',
        game,
        player: { steamid: player.steamid, username: player.username },
        answer: game.hours,
        answered: false,
        playerAnswer: null,
        score: 0,
      });
    }
  }

  return pickRandom(pool, Math.min(count, pool.length));
}

/**
 * Mode 3 — Who owns it? Show game + hours, guess the owner.
 * Need at least 3 players. Options = all player usernames.
 */
function generateMode3(players, count) {
  const allUsernames = players.map(p => p.username);
  const pool = [];

  for (const player of players) {
    for (const game of player.games) {
      // Shuffle options so the correct answer isn't always in the same position
      const options = shuffle([...allUsernames]);

      pool.push({
        type: 'guess_owner',
        game,
        player: { steamid: player.steamid, username: player.username },
        displayHours: game.hours, // Hours are shown in this mode
        options,
        answer: player.username,
        answered: false,
        playerAnswer: null,
        score: 0,
      });
    }
  }

  return pickRandom(pool, Math.min(count, pool.length));
}

/**
 * Create the initial game state.
 *
 * @param {Object} params
 * @param {number} params.mode
 * @param {Array} params.players
 * @param {number} params.questionCount
 * @returns {Object} Game state
 */
export function createGameState({ mode, players, questionCount }) {
  const modeConfig = getMode(mode);
  const questions = generateQuestions({ mode, players, questionCount });

  // Initialize scores per "answering" player
  // In mode 1: solo player
  // In mode 2 & 3: all players take turns
  const playerTurns = mode === 1
    ? [players[0].username]
    : players.map(p => p.username);

  const scores = {};
  playerTurns.forEach(name => { scores[name] = 0; });

  return {
    mode,
    modeConfig,
    players,
    questions,
    currentQuestion: 0,
    currentPlayerTurn: 0,
    playerTurns,
    scores,
    finished: false,
  };
}

/**
 * Get the current question.
 * @param {Object} state
 * @returns {Object|null}
 */
export function getCurrentQuestion(state) {
  if (state.currentQuestion >= state.questions.length) return null;
  return state.questions[state.currentQuestion];
}

/**
 * Get the name of the player whose turn it is.
 * @param {Object} state
 * @returns {string}
 */
export function getCurrentPlayerTurn(state) {
  return state.playerTurns[state.currentPlayerTurn % state.playerTurns.length];
}

/**
 * Submit an answer and advance to the next question.
 * @param {Object} state
 * @param {*} answer - The player's answer
 * @param {number} score - Calculated score for this answer
 * @returns {Object} Updated state (mutated in place)
 */
export function submitAnswer(state, answer, score) {
  const question = state.questions[state.currentQuestion];
  question.answered = true;
  question.playerAnswer = answer;
  question.score = score;

  // Add score to current turn player
  const turnPlayer = getCurrentPlayerTurn(state);
  state.scores[turnPlayer] = (state.scores[turnPlayer] || 0) + score;

  // Advance
  state.currentQuestion++;
  state.currentPlayerTurn++;

  if (state.currentQuestion >= state.questions.length) {
    state.finished = true;
  }

  return state;
}
