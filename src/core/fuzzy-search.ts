import { Worker } from 'node:worker_threads';
import type { FuzzyMatch } from './fuzzy-search-core.js';
export { recursiveFuzzyIndexOf, getSimilarityRatio } from './fuzzy-search-core.js';

export const FUZZY_SEARCH_TIMEOUT_MS = 30000;
const WORKER_CODE = `
const { workerData, parentPort } = require('worker_threads');
import(workerData.moduleUrl)
  .then((m) => parentPort.postMessage({ ok: true, result: m.runFuzzySearch(workerData.text, workerData.query).result }))
  .catch((err) => parentPort.postMessage({ ok: false, error: String(err && err.stack || err) }));
`;
const CORE_MODULE_URL = new URL('./fuzzy-search-core.js', import.meta.url).href;

export function runFuzzySearchInWorker(
  text: string,
  query: string,
  timeoutMs = FUZZY_SEARCH_TIMEOUT_MS
): Promise<FuzzyMatch> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { moduleUrl: CORE_MODULE_URL, text, query }
    });
    worker.unref();
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error(`Fuzzy search timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref();

    worker.once('message', (msg: { ok: boolean; result?: FuzzyMatch; error?: string }) => {
      clearTimeout(timer);
      void worker.terminate();
      if (msg.ok && msg.result) resolve(msg.result);
      else reject(new Error(msg.error || 'Fuzzy search worker failed'));
    });
    worker.once('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
