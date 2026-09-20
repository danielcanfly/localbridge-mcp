import fs from 'node:fs/promises';
import { getSimilarityRatio, runFuzzySearchInWorker } from './fuzzy-search.js';
import { validatePath } from './filesystem.js';

export interface EditResult {
  replacements: number;
  fuzzy: boolean;
  similarity?: number;
}

export async function editBlock(
  filePath: string,
  oldString: string,
  newString: string,
  expectedReplacements = 1
): Promise<EditResult> {
  const file = await validatePath(filePath);
  const text = await fs.readFile(file, 'utf8');
  const occurrences = oldString ? text.split(oldString).length - 1 : 0;

  if (occurrences === expectedReplacements && occurrences > 0) {
    const updated = text.split(oldString).join(newString);
    await fs.writeFile(file, updated, 'utf8');
    return { replacements: occurrences, fuzzy: false };
  }

  if (expectedReplacements !== 1) {
    throw new Error(`Expected ${expectedReplacements} exact replacements, found ${occurrences}`);
  }
  if (!oldString) throw new Error('oldString must not be empty');

  const match = await runFuzzySearchInWorker(text, oldString);
  const similarity = getSimilarityRatio(match.value, oldString);
  if (similarity < 0.7) {
    throw new Error(`No sufficiently similar block found (similarity=${similarity.toFixed(3)})`);
  }

  const updated = text.slice(0, match.start) + newString + text.slice(match.end);
  await fs.writeFile(file, updated, 'utf8');
  return { replacements: 1, fuzzy: true, similarity };
}
