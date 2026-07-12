// Genera el par de claves VAPID para los recordatorios Web Push.
// Uso:  node scripts/generate-vapid.mjs
// Escribe vapid.json (secret VAPID_KEYS, ¡NO commitear!) e imprime la clave
// pública en formato applicationServerKey (VITE_VAPID_PUBLIC_KEY).
// Mismo formato JWK que espera importVapidKeys de @negrel/webpush.
import { writeFileSync } from 'node:fs';

const pair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const exported = {
  publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey),
  privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
};
writeFileSync('vapid.json', JSON.stringify(exported));

const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const publicKey = Buffer.from(raw).toString('base64url');

console.log('vapid.json escrito (secret VAPID_KEYS — guárdalo fuera del repo).');
console.log('\nVITE_VAPID_PUBLIC_KEY:\n' + publicKey);
