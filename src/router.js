/**
 * SteamTrivia — Simple hash-based router
 * Manages navigation between screens without page reloads.
 */

const routes = {};
let currentCleanup = null;

/**
 * Register a route handler.
 * @param {string} path - Route path (e.g. 'config', 'question', 'results')
 * @param {Function} handler - Function that receives the app container and returns a cleanup function (optional)
 */
export function route(path, handler) {
  routes[path] = handler;
}

/**
 * Navigate to a route.
 * @param {string} path - Route to navigate to
 * @param {Object} [data] - Optional data to pass to the route handler
 */
export function navigate(path, data) {
  window._routeData = data || null;
  window.location.hash = path;
}

/**
 * Get data passed to the current route via navigate().
 */
export function getRouteData() {
  return window._routeData || null;
}

/**
 * Initialize the router. Call once on app startup.
 */
export function initRouter() {
  const app = document.getElementById('app');

  function handleRoute() {
    const hash = window.location.hash.slice(1) || 'config';

    // Cleanup previous screen
    if (typeof currentCleanup === 'function') {
      currentCleanup();
    }

    const handler = routes[hash];
    if (handler) {
      app.innerHTML = '';
      currentCleanup = handler(app) || null;
    } else {
      // Fallback to config
      navigate('config');
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
