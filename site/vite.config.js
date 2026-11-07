import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRepoFacts } from './src/repoFacts.mjs';

// The page imports ../lib/*.js (the app's own model code) and reads repo facts from disk at build time,
// so every number is computed from the repo, never typed. Served under /BigFish/lab/ beside the Next.js app.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoFacts = {
  name: 'repo-facts',
  resolveId: (id) => (id === 'virtual:repo-facts' ? '\0repo-facts' : null),
  load: (id) => (id === '\0repo-facts' ? `export default ${JSON.stringify(readRepoFacts(root))};` : null),
};

export default defineConfig({
  base: '/BigFish/lab/',
  plugins: [react(), repoFacts],
  server: { fs: { allow: ['..'] } },
});
