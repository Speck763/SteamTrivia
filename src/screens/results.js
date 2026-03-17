/**
 * SteamTrivia — Results Screen
 *
 * Shows final scores and per-question breakdown.
 */

import { getGameImageURL } from '../api/steam.js';
import { totalScore, maxPossibleScore, getScoreLabel } from '../game/scoring.js';
import { navigate, getRouteData } from '../router.js';

/**
 * Render the results screen.
 * @param {HTMLElement} container
 */
export function renderResultsScreen(container) {
  const data = getRouteData();
  if (!data || !data.state) {
    navigate('config');
    return;
  }

  const { state } = data;
  const total = totalScore(state.questions);
  const max = maxPossibleScore(state.questions.length, state.mode);
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;

  // Sort scores descending
  const sortedScores = Object.entries(state.scores)
    .sort(([, a], [, b]) => b - a);

  container.innerHTML = `
    <div class="screen">
      <header class="text-center" style="margin-bottom: var(--space-2xl)">
        <h1 class="title anim-slide-down">Resultados</h1>
      </header>

      <!-- Overall Score -->
      <div class="card anim-scale-in text-center" style="margin-bottom: var(--space-xl)">
        <div class="score-display">
          <div class="score-display__value anim-score-reveal">${total}</div>
          <div class="score-display__label">
            de ${max} puntos (${percentage}%)
          </div>
        </div>

        <div style="margin-top: var(--space-lg)">
          ${getOverallEmoji(percentage)}
        </div>
      </div>

      <!-- Player Rankings (multiplayer) -->
      ${sortedScores.length > 1 ? `
        <section style="margin-bottom: var(--space-xl)" class="anim-slide-up">
          <div class="section-title">🏆 Ranking</div>
          <div style="display: flex; flex-direction: column; gap: var(--space-sm)" class="stagger">
            ${sortedScores.map(([name, score], i) => `
              <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md) var(--space-lg); animation-delay: ${i * 60}ms">
                <div style="display: flex; align-items: center; gap: var(--space-md)">
                  <span style="font-size: var(--font-size-xl)">${getRankEmoji(i)}</span>
                  <span style="font-weight: 600">${escapeHTML(name)}</span>
                </div>
                <span style="font-weight: 700; color: var(--color-accent)">${score}</span>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Question Breakdown -->
      <section style="margin-bottom: var(--space-xl)" class="anim-slide-up" style="animation-delay: 200ms">
        <div class="section-title">📋 Desglose por pregunta</div>
        <div style="display: flex; flex-direction: column; gap: var(--space-sm)" class="stagger">
          ${state.questions.map((q, i) => {
            const isHours = q.type === 'guess_hours';
            const label = isHours ? getScoreLabel(q.score) : null;

            return `
              <div class="result-row anim-fade-in" style="animation-delay: ${i * 40}ms">
                <img class="result-row__image" src="${getGameImageURL(q.game.appid)}" alt="${escapeHTML(q.game.name)}" loading="lazy" />
                <div class="result-row__info">
                  <div class="result-row__game">${escapeHTML(q.game.name)}</div>
                  <div class="result-row__detail">
                    ${isHours
                      ? `Real: ${q.answer.toFixed(1)}h — Tu respuesta: ${parseFloat(q.playerAnswer).toFixed(1)}h`
                      : `Respuesta: ${escapeHTML(String(q.playerAnswer))} — Correcto: ${escapeHTML(q.answer)}`
                    }
                  </div>
                </div>
                <div class="result-row__score" style="color: ${q.score > 0 ? 'var(--color-success)' : 'var(--color-error)'}">
                  ${isHours ? `+${q.score}` : (q.score === 1 ? '✓' : '✗')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Play Again -->
      <div class="anim-slide-up" style="animation-delay: 400ms">
        <button class="btn btn--primary btn--large btn--full" id="play-again-btn">
          🔄 Jugar de nuevo
        </button>
      </div>
    </div>
  `;

  container.querySelector('#play-again-btn').addEventListener('click', () => {
    navigate('config');
  });
}

function getOverallEmoji(percentage) {
  if (percentage >= 90) return '<span style="font-size: var(--font-size-3xl)">🏆 ¡Increíble!</span>';
  if (percentage >= 70) return '<span style="font-size: var(--font-size-3xl)">🔥 ¡Muy bien!</span>';
  if (percentage >= 50) return '<span style="font-size: var(--font-size-3xl)">👍 Nada mal</span>';
  if (percentage >= 30) return '<span style="font-size: var(--font-size-3xl)">🤔 Se puede mejorar</span>';
  return '<span style="font-size: var(--font-size-3xl)">😅 ¿Seguro que jugás Steam?</span>';
}

function getRankEmoji(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
