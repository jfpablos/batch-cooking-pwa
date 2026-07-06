/**
 * Normaliza texto para comparaciones: minusculas, sin acentos,
 * caracteres no alfanumericos convertidos a espacios.
 */
export const normalizeText = (str: string): string =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
