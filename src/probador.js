// Probador: a digital mannequin. Each zone cycles through the items of one category.
import * as db from './db.js';
import { aviso, pedir } from './ui.js';

export const SLOTS = [
  { key: 'cabeza', cat: 'Cabeza', label: 'Cabeza' },
  { key: 'accesorio', cat: 'Accesorios', label: 'Accesorio' },
  { key: 'torso', cat: 'Parte de arriba', label: 'Arriba' },
  { key: 'capa', cat: 'Capa exterior', label: 'Capa' },
  { key: 'piernas', cat: 'Parte de abajo', label: 'Abajo' },
  { key: 'pies', cat: 'Calzado', label: 'Calzado' },
];
const ON_BY_DEFAULT = new Set(['torso', 'piernas', 'pies']);

const root = document.querySelector('#maniqui');
let groups = {};
let urls = new Map();
// Selected item id per zone; null = zone empty on purpose.
let sel = JSON.parse(localStorage.getItem('probador') || '{}');
const remember = () => localStorage.setItem('probador', JSON.stringify(sel));

root.innerHTML = SLOTS.map(s => `
  <div class="slot" data-slot="${s.key}" style="grid-area:${s.key}">
    <button class="arrow" data-step="-1" aria-label="${s.label}: anterior">‹</button>
    <div class="ver"><img alt=""><span class="slot-empty">${s.label}</span></div>
    <button class="arrow" data-step="1" aria-label="${s.label}: siguiente">›</button>
  </div>`).join('');
root.querySelectorAll('.arrow').forEach(b => b.onclick = () => step(b.closest('.slot').dataset.slot, +b.dataset.step));

function paint(key) {
  const el = root.querySelector(`[data-slot=${key}]`);
  const item = groups[key].find(i => i.id === sel[key]);
  const img = el.querySelector('img');
  img.hidden = !item;
  if (item) { img.src = urls.get(item.id); img.alt = item.tipo || item.categoria; }
  el.querySelector('.slot-empty').hidden = !!item;
  el.querySelectorAll('.arrow').forEach(b => b.disabled = groups[key].length === 0);
}

function step(key, d) {
  const ids = [null, ...groups[key].map(i => i.id)]; // "nothing" is one of the options
  const n = Math.max(0, ids.indexOf(sel[key] ?? null));
  sel[key] = ids[(n + d + ids.length) % ids.length];
  remember();
  paint(key);
}

export async function renderProbador() {
  const items = (await db.all('items')).sort((a, b) => b.createdAt - a.createdAt);
  urls.forEach(URL.revokeObjectURL);
  urls = new Map(items.map(i => [i.id, URL.createObjectURL(i.image)]));
  groups = Object.fromEntries(SLOTS.map(s => [s.key, items.filter(i => i.categoria === s.cat)]));
  for (const { key } of SLOTS) {
    // Pick a default when the zone was never touched or its item was deleted.
    if (sel[key] !== null && !groups[key].some(i => i.id === sel[key]))
      sel[key] = ON_BY_DEFAULT.has(key) ? groups[key][0]?.id ?? null : null;
    paint(key);
  }
  remember();
  document.querySelector('#probador-empty').hidden = items.length > 0;
  root.hidden = items.length === 0;
}

/** Puts an outfit on the mannequin (used by Outfits and the chat). */
export function ponerOutfit(prendas) {
  sel = Object.fromEntries(SLOTS.map(s => [s.key, prendas[s.key] ?? null]));
  remember();
}

export async function guardarOutfit() {
  const prendas = Object.fromEntries(SLOTS.map(s => [s.key, sel[s.key] ?? null]));
  if (!Object.values(prendas).some(Boolean)) return aviso('Elige al menos una prenda.');
  const nombre = await pedir('Nombre del outfit:');
  if (nombre === null) return;
  await db.put('outfits', { id: db.newId(), nombre: nombre.trim() || 'Outfit', createdAt: Date.now(), prendas });
  aviso('Outfit guardado.');
}
