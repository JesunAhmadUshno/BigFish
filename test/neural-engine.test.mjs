// Trained weights must survive a reload: a fresh copy of the engine (new tab, page reload)
// predicts with the weights the backtester saved, not a new random network.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as tf from '@tensorflow/tfjs';

// Node has no IndexedDB, so stand in an in-memory store for the indexeddb:// scheme.
const store = new Map();
const memoryRouter = (url) => {
  if (!url.startsWith('indexeddb://')) return null;
  return {
    save: async (artifacts) => { store.set(url, artifacts); return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } }; },
    load: async () => { if (!store.has(url)) throw new Error('not found'); return store.get(url); },
  };
};
tf.io.registerSaveRouter(memoryRouter);
tf.io.registerLoadRouter(memoryRouter);

const features = { homeElo: 1900, awayElo: 1600, homeXG: 1.8, awayXG: 0.9 };

test('predictions after a reload use the saved trained weights', async () => {
  tf.setBackend('cpu');
  const first = await import('../lib/neural-engine.js?tab=1');
  const matches = Array.from({ length: 40 }, (_, i) => ({
    homeElo: 1500 + (i % 7) * 50, awayElo: 1500 + (i % 5) * 60, homeXG: 1.5, awayXG: 1.1,
    result: ['home', 'draw', 'away'][i % 3],
  }));
  await first.trainModel(matches);
  const trained = await first.predictWithDeepLearning(features);

  const reloaded = await import('../lib/neural-engine.js?tab=2'); // fresh module singleton
  const after = await reloaded.predictWithDeepLearning(features);
  for (const k of ['home', 'draw', 'away']) assert.ok(Math.abs(after[k] - trained[k]) < 1e-6, `${k}: ${after[k]} vs ${trained[k]}`);
});
