import { defineConfig, loadEnv } from 'vite';
import steamApiPlugin from './vite-plugin-steam-api.js';

export default defineConfig(({ mode }) => {
  // Load .env file so STEAM_API_KEY is available in process.env
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      minify: 'oxc',
      target: 'es2020',
    },
    server: {
      port: 3000,
      open: true,
    },
    plugins: [
      steamApiPlugin(),
    ],
  };
});
