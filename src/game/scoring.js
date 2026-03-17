/**
 * SteamTrivia — Scoring System
 *
 * Modo 1 & 2: Proximity scoring (GeoGuessr style) — max 1000 points
 * Modo 3: Binary scoring — +1 correct, +0 incorrect
 */

const MAX_SCORE = 1000;

/**
 * Calculate proximity score for hour-guessing modes.
 * Uses exponential decay — the further off, the fewer points.
 *
 * @param {number} guess - Player's guess (hours)
 * @param {number} actual - Real value (hours)
 * @returns {number} Score between 0 and 1000
 */
export function calculateProximityScore(guess, actual) {
  if (guess === actual) return MAX_SCORE;

  const diff = Math.abs(guess - actual);
  const tolerance = Math.max(actual * 0.5, 1); // 50% of actual, minimum 1

  const score = MAX_SCORE * Math.exp(-3 * (diff / tolerance));
  return Math.round(Math.max(score, 0));
}

/**
 * Get a text label describing how close the guess was.
 * @param {number} score
 * @returns {{ label: string, class: string }}
 */
export function getScoreLabel(score) {
  if (score >= 900) return { label: '🎯 ¡Exacto!', class: 'badge--success' };
  if (score >= 600) return { label: '🔥 ¡Muy cerca!', class: 'badge--success' };
  if (score >= 300) return { label: '👍 Cerca', class: 'badge--accent' };
  if (score >= 100) return { label: '🤏 Más o menos', class: 'badge--accent' };
  return { label: '❌ Lejos', class: 'badge--error' };
}

/**
 * Check if a "guess the owner" answer is correct (Mode 3).
 * @param {string} guess - Guessed username
 * @param {string} actual - Correct username
 * @returns {number} 1 if correct, 0 if not
 */
export function calculateOwnerScore(guess, actual) {
  return guess === actual ? 1 : 0;
}

/**
 * Calculate total score from an array of question results.
 * @param {Array<{score: number}>} results
 * @returns {number}
 */
export function totalScore(results) {
  return results.reduce((sum, r) => sum + r.score, 0);
}

/**
 * Max possible score for a set of questions.
 * @param {number} questionCount
 * @param {number} mode - Game mode (1, 2, or 3)
 * @returns {number}
 */
export function maxPossibleScore(questionCount, mode) {
  return mode === 3 ? questionCount : questionCount * MAX_SCORE;
}
