/**
 * Normaliza texto para comparaciones: minusculas, sin acentos,
 * caracteres no alfanumericos convertidos a espacios, espacios colapsados.
 */
export const normalizeText = (str: string): string =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Palabras normalizadas de un texto, filtradas por longitud mínima. */
export const textWords = (str: string, minLength = 3): string[] =>
  normalizeText(str)
    .split(' ')
    .filter(w => w.length >= minLength);

/**
 * Busca el candidato más parecido a un nombre por solape de palabras completas
 * (no substrings: "pollo" no coincide con "repollo"). Devuelve null si ninguno
 * supera el umbral de solape.
 */
export function findBestNameMatch(name: string, candidates: string[]): string | null {
  const normalized = normalizeText(name);
  const exact = candidates.find(c => normalizeText(c) === normalized);
  if (exact) return exact;

  const nameWords = new Set(textWords(name));
  if (nameWords.size === 0) return null;

  let best: string | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const candWords = textWords(candidate);
    if (candWords.length === 0) continue;
    const overlap = candWords.filter(w => nameWords.has(w)).length;
    const score = overlap / Math.min(candWords.length, nameWords.size);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore >= 0.6 ? best : null;
}
