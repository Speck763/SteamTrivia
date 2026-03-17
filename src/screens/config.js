/**
 * SteamTrivia — Config Screen
 *
 * Players enter Steam IDs, pick a game mode, and set question count.
 */

import { resolveInput, fetchSteamProfile } from '../api/steam.js';
import { MODES } from '../game/modes.js';
import { navigate } from '../router.js';

/**
 * Render the config screen.
 * @param {HTMLElement} container
 */
export function renderConfigScreen(container) {
  let selectedMode = null;
  let questionCount = 10;
  const players = []; // { input, steamid, username, games[] }

  container.innerHTML = `
    <div class="screen">
      <header class="text-center" style="margin-bottom: var(--space-2xl)">
        <h1 class="title anim-slide-down">SteamTrivia</h1>
        <p class="subtitle anim-fade-in" style="margin-top: var(--space-sm)">
          ¿Cuánto conocés tus horas en Steam?
        </p>
      </header>

      <!-- Steam ID Input -->
      <section class="anim-slide-up" style="margin-bottom: var(--space-xl)">
        <div class="section-title">👤 Jugadores</div>
        <div class="input-group" style="margin-bottom: var(--space-md)">
          <label for="steam-input">ID de amigo o link de perfil de Steam</label>
          <div style="display: flex; gap: var(--space-sm)">
            <input
              class="input"
              type="text"
              id="steam-input"
              placeholder="1070035579 / steamcommunity.com/profiles/..."
            />
            <button class="btn btn--primary" id="add-player-btn">Agregar</button>
          </div>
          <div id="input-error" style="color: var(--color-error); font-size: var(--font-size-xs); min-height: 1.2em; margin-top: var(--space-xs)"></div>
        </div>

        <div id="player-list" style="display: flex; flex-wrap: wrap; gap: var(--space-sm)"></div>
      </section>

      <!-- Mode Selection -->
      <section class="anim-slide-up" style="margin-bottom: var(--space-xl); animation-delay: 100ms">
        <div class="section-title">🎮 Modo de juego</div>
        <div class="mode-grid stagger" id="mode-grid"></div>
      </section>

      <!-- Question Count -->
      <section class="anim-slide-up" style="margin-bottom: var(--space-xl); animation-delay: 200ms">
        <div class="section-title">📝 Cantidad de preguntas</div>
        <div class="range-container">
          <input type="range" id="question-range" min="3" max="30" value="10" />
          <div class="range-value" id="question-count-display">10</div>
        </div>
      </section>

      <!-- Start Button -->
      <div class="anim-slide-up" style="animation-delay: 300ms">
        <button class="btn btn--primary btn--large btn--full" id="start-btn" disabled>
          Iniciar partida
        </button>
        <div id="start-error" class="text-center" style="color: var(--color-error); font-size: var(--font-size-sm); margin-top: var(--space-sm); min-height: 1.2em;"></div>
      </div>
    </div>
  `;

  // --- Render modes ---
  const modeGrid = container.querySelector('#mode-grid');
  MODES.forEach(mode => {
    const card = document.createElement('div');
    card.className = 'card card--interactive mode-card';
    card.dataset.modeId = mode.id;
    card.innerHTML = `
      <div class="mode-card__icon">${mode.icon}</div>
      <div class="mode-card__title">${mode.name}</div>
      <div class="mode-card__desc">${mode.description}</div>
      <div class="mode-card__players">${mode.minPlayers === mode.maxPlayers ? `${mode.minPlayers} jugador` : `${mode.minPlayers}–${mode.maxPlayers} jugadores`}</div>
    `;
    card.addEventListener('click', () => {
      selectedMode = mode.id;
      modeGrid.querySelectorAll('.card').forEach(c => c.classList.remove('card--selected'));
      card.classList.add('card--selected');
      validateForm();
    });
    modeGrid.appendChild(card);
  });

  // --- Add player ---
  const inputEl = container.querySelector('#steam-input');
  const addBtn = container.querySelector('#add-player-btn');
  const errorEl = container.querySelector('#input-error');
  const playerListEl = container.querySelector('#player-list');

  async function addPlayer() {
    const value = inputEl.value.trim();
    if (!value) return;

    addBtn.disabled = true;
    addBtn.textContent = '...';
    errorEl.textContent = '';

    try {
      const steamid = resolveInput(value);

      // Check duplicate
      if (players.some(p => p.steamid === steamid)) {
        errorEl.textContent = 'Este jugador ya fue agregado.';
        return;
      }

      // Fetch profile
      const profile = await fetchSteamProfile(steamid);

      if (!profile.games || profile.games.length === 0) {
        errorEl.textContent = 'Este perfil no tiene juegos públicos o tiene 0 juegos con más de 1 hora.';
        return;
      }

      const player = {
        steamid: profile.steamid,
        username: profile.username || `User ${steamid.slice(-4)}`,
        games: profile.games,
      };

      players.push(player);
      inputEl.value = '';
      renderPlayerTags();
      validateForm();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = 'Agregar';
    }
  }

  addBtn.addEventListener('click', addPlayer);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlayer();
  });

  function renderPlayerTags() {
    playerListEl.innerHTML = '';
    players.forEach((p, i) => {
      const tag = document.createElement('div');
      tag.className = 'player-tag anim-scale-in';
      tag.innerHTML = `
        <span>${escapeHTML(p.username)}</span>
        <button class="player-tag__remove" data-index="${i}" title="Quitar">✕</button>
      `;
      tag.querySelector('.player-tag__remove').addEventListener('click', () => {
        players.splice(i, 1);
        renderPlayerTags();
        validateForm();
      });
      playerListEl.appendChild(tag);
    });
  }

  // --- Question count slider ---
  const rangeEl = container.querySelector('#question-range');
  const countDisplay = container.querySelector('#question-count-display');
  rangeEl.addEventListener('input', () => {
    questionCount = parseInt(rangeEl.value);
    countDisplay.textContent = questionCount;
  });

  // --- Form validation ---
  const startBtn = container.querySelector('#start-btn');
  const startError = container.querySelector('#start-error');

  function validateForm() {
    startError.textContent = '';

    if (selectedMode === null || players.length === 0) {
      startBtn.disabled = true;
      return;
    }

    const mode = MODES.find(m => m.id === selectedMode);
    if (players.length < mode.minPlayers) {
      startError.textContent = `Este modo necesita al menos ${mode.minPlayers} jugador(es).`;
      startBtn.disabled = true;
      return;
    }

    if (players.length > mode.maxPlayers) {
      startError.textContent = `Este modo permite máximo ${mode.maxPlayers} jugadores.`;
      startBtn.disabled = true;
      return;
    }

    startBtn.disabled = false;
  }

  // --- Start game ---
  startBtn.addEventListener('click', () => {
    if (startBtn.disabled) return;

    navigate('question', {
      mode: selectedMode,
      players: [...players],
      questionCount,
    });
  });
}

/** Escape HTML to prevent XSS */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
