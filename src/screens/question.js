/**
 * SteamTrivia — Question Screen
 *
 * Displays questions one at a time. Handles both hour-guessing and owner-guessing.
 */

import { getGameImageURL } from '../api/steam.js';
import { createGameState, getCurrentQuestion, getCurrentPlayerTurn, submitAnswer } from '../game/engine.js';
import { calculateProximityScore, calculateOwnerScore, getScoreLabel } from '../game/scoring.js';
import { navigate, getRouteData } from '../router.js';

/**
 * Render the question screen.
 * @param {HTMLElement} container
 */
export function renderQuestionScreen(container) {
  const data = getRouteData();
  if (!data) {
    navigate('config');
    return;
  }

  const state = createGameState(data);

  function render() {
    const question = getCurrentQuestion(state);

    if (!question || state.finished) {
      navigate('results', { state });
      return;
    }

    const progress = ((state.currentQuestion) / state.questions.length) * 100;
    const turnPlayer = getCurrentPlayerTurn(state);
    const isHoursMode = question.type === 'guess_hours';
    const showPlayer = state.mode >= 2;

    container.innerHTML = `
      <div class="screen">
        <!-- Progress -->
        <div style="margin-bottom: var(--space-xl)">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm)">
            <span class="badge badge--accent">Pregunta ${state.currentQuestion + 1} / ${state.questions.length}</span>
            ${state.mode !== 1 ? `<span style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">Turno de <strong>${escapeHTML(turnPlayer)}</strong></span>` : ''}
          </div>
          <div class="progress">
            <div class="progress__bar" style="width: ${progress}%"></div>
          </div>
        </div>

        <!-- Game Card -->
        <div class="card anim-scale-in" style="margin-bottom: var(--space-xl); text-align: center;">
          <img
            class="game-image"
            src="${getGameImageURL(question.game.appid)}"
            alt="${escapeHTML(question.game.name)}"
            loading="lazy"
          />
          <h2 style="font-size: var(--font-size-xl); font-weight: 700; margin-top: var(--space-lg);">
            ${escapeHTML(question.game.name)}
          </h2>

          ${showPlayer && isHoursMode ? `
            <p style="color: var(--color-text-secondary); margin-top: var(--space-sm);">
              Jugador: <strong style="color: var(--color-accent)">${escapeHTML(question.player.username)}</strong>
            </p>
          ` : ''}

          ${!isHoursMode ? `
            <p style="color: var(--color-accent); font-size: var(--font-size-2xl); font-weight: 700; margin-top: var(--space-md)">
              ${question.displayHours.toFixed(1)} horas
            </p>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-top: var(--space-xs)">
              ¿A quién pertenece este registro?
            </p>
          ` : ''}
        </div>

        <!-- Answer Input -->
        <div id="answer-section" class="anim-slide-up">
          ${isHoursMode ? `
            <div class="section-title">¿Cuántas horas?</div>
            <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md)">
              <input
                class="input"
                type="number"
                id="hours-input"
                placeholder="Ej: 250"
                min="1"
                step="1"
                autofocus
              />
              <button class="btn btn--primary" id="submit-hours-btn">Responder</button>
            </div>
          ` : `
            <div class="section-title">¿De quién es?</div>
            <div class="option-grid" id="options-grid"></div>
          `}
        </div>

        <!-- Feedback (hidden initially) -->
        <div id="feedback-section" class="hidden"></div>
      </div>
    `;

    if (isHoursMode) {
      setupHoursInput(question);
    } else {
      setupOwnerOptions(question);
    }
  }

  function setupHoursInput(question) {
    const input = container.querySelector('#hours-input');
    const btn = container.querySelector('#submit-hours-btn');

    function submit() {
      const guess = parseFloat(input.value);
      if (isNaN(guess) || guess < 0) return;

      const score = calculateProximityScore(guess, question.answer);
      showFeedback(question, guess, score, true);
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  function setupOwnerOptions(question) {
    const grid = container.querySelector('#options-grid');
    question.options.forEach(username => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = username;
      btn.addEventListener('click', () => {
        const score = calculateOwnerScore(username, question.answer);
        // Highlight correct/wrong
        grid.querySelectorAll('.option-btn').forEach(b => {
          b.disabled = true;
          if (b.textContent === question.answer) {
            b.classList.add('option-btn--correct');
          } else if (b.textContent === username && username !== question.answer) {
            b.classList.add('option-btn--wrong');
          }
        });
        showFeedback(question, username, score, false);
      });
      grid.appendChild(btn);
    });
  }

  function showFeedback(question, answer, score, isHoursMode) {
    const answerSection = container.querySelector('#answer-section');
    const feedbackSection = container.querySelector('#feedback-section');

    if (isHoursMode) {
      // Disable inputs
      const input = container.querySelector('#hours-input');
      const btn = container.querySelector('#submit-hours-btn');
      if (input) input.disabled = true;
      if (btn) btn.disabled = true;
    }

    const label = isHoursMode ? getScoreLabel(score) : null;

    feedbackSection.classList.remove('hidden');
    feedbackSection.innerHTML = `
      <div class="card anim-scale-in" style="text-align: center; margin-top: var(--space-lg)">
        ${isHoursMode ? `
          <div style="margin-bottom: var(--space-md)">
            <span class="badge ${label.class}">${label.label}</span>
          </div>
          <div style="color: var(--color-text-secondary); margin-bottom: var(--space-sm)">
            Horas reales: <strong style="color: var(--color-text-primary)">${question.answer.toFixed(1)}</strong>
          </div>
          <div style="color: var(--color-text-secondary)">
            Tu respuesta: <strong style="color: var(--color-text-primary)">${parseFloat(answer).toFixed(1)}</strong>
          </div>
          <div class="score-display" style="margin-top: var(--space-lg)">
            <div class="score-display__value anim-score-reveal">+${score}</div>
            <div class="score-display__label">puntos</div>
          </div>
        ` : `
          <div style="margin-bottom: var(--space-sm)">
            ${score === 1
              ? '<span class="badge badge--success">🎯 ¡Correcto!</span>'
              : `<span class="badge badge--error">❌ Incorrecto — Era ${escapeHTML(question.answer)}</span>`
            }
          </div>
          <div class="score-display" style="margin-top: var(--space-md)">
            <div class="score-display__value anim-score-reveal">${score === 1 ? '+1' : '+0'}</div>
            <div class="score-display__label">punto${score === 1 ? '' : 's'}</div>
          </div>
        `}
        <button class="btn btn--primary" style="margin-top: var(--space-xl)" id="next-btn">
          ${state.currentQuestion + 1 >= state.questions.length ? 'Ver resultados' : 'Siguiente pregunta'}
        </button>
      </div>
    `;

    // Submit answer to engine
    submitAnswer(state, answer, score);

    container.querySelector('#next-btn').addEventListener('click', render);
  }

  // Initial render
  render();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
