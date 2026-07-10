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

// Conectores frecuentes en nombres de recetas que no aportan significado:
// sin filtrarlos, "Arroz con pollo" y "Arroz con verduras" comparten 2/3 palabras.
const NAME_STOPWORDS = new Set(['con', 'del', 'los', 'las', 'una', 'unos', 'unas', 'para', 'sin', 'estilo']);

const significantWords = (str: string): string[] =>
  textWords(str).filter(w => !NAME_STOPWORDS.has(w));

/**
 * Busca el candidato más parecido a un nombre por solape de palabras completas
 * (no substrings: "pollo" no coincide con "repollo"). Devuelve null si ninguno
 * supera el umbral de solape.
 */
export function findBestNameMatch(name: string, candidates: string[]): string | null {
  const normalized = normalizeText(name);
  const exact = candidates.find(c => normalizeText(c) === normalized);
  if (exact) return exact;

  const nameWords = new Set(significantWords(name));
  if (nameWords.size === 0) return null;

  let best: string | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const candWords = significantWords(candidate);
    if (candWords.length === 0) continue;
    const overlap = candWords.filter(w => nameWords.has(w)).length;
    // Denominador max: un candidato corto ("Pollo") no puede puntuar 1.0
    // contra cualquier nombre largo que contenga esa palabra, y dos platos
    // distintos que solo comparten la base ("Arroz con X") quedan por debajo
    // del umbral en vez de confundirse.
    const score = overlap / Math.max(candWords.length, nameWords.size);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore >= 0.6 ? best : null;
}
