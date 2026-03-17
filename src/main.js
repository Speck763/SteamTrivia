/**
 * SteamTrivia — App Entry Point
 */

import { initRouter, route } from './router.js';
import { renderConfigScreen } from './screens/config.js';
import { renderQuestionScreen } from './screens/question.js';
import { renderResultsScreen } from './screens/results.js';

// Register routes
route('config', renderConfigScreen);
route('question', renderQuestionScreen);
route('results', renderResultsScreen);

// Start the router
initRouter();
