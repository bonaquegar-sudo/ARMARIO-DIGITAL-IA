// Outfits: saved combinations, shown as mini mannequins.
import * as db from './db.js';
import { confirmar, pedir } from './ui.js';
import { SLOTS, ponerOutfit } from './probador.js';

const grid = document.querySelector('#outfits-grid');
let urls = [];

/** Mini mannequin for an outfit. Created object URLs are pushed into `urls` (caller revokes). */
export function miniOutfit(prendas, byId, urls) {
  const mini = Object.assign(document.createElement('button'), { className: 'mini', ariaLabel: 'Probar' });
  for (const { key } of SLOTS) {
    const it = byId.get(prendas[key]);
    if (!it) continue; // deleted items just vanish
    const src = URL.createObjectURL(it.image);
    urls.push(src);
    mini.append(Object.assign(document.createElement('img'), { src, alt: it.tipo || '', style: `grid-area:${key}` }));
  }
  mini.onclick = () => probarOutfit(prendas);
  return mini;
}

export function probarOutfit(prendas) {
  ponerOutfit(prendas);
  document.querySelector('[data-view=probador]').click();
}

export async function renderOutfits() {
  const [outfits, items] = await Promise.all([db.all('outfits'), db.all('items')]);
  const byId = new Map(items.map(i => [i.id, i]));
  urls.forEach(URL.revokeObjectURL);
  urls = [];
  outfits.sort((a, b) => b.createdAt - a.createdAt);

  grid.replaceChildren(...outfits.map(o => {
    const n = SLOTS.filter(s => byId.has(o.prendas[s.key])).length;
    const card = document.createElement('article');
    card.className = 'outfit';
    card.innerHTML = `
      <div class="outfit-info"><b></b><span class="muted small"></span></div>
      <div class="row">
        <button data-a="probar">Probar</button><button data-a="renombrar">Renombrar</button>
        <button data-a="eliminar" class="push">Eliminar</button>
      </div>`;
    card.prepend(miniOutfit(o.prendas, byId, urls));
    card.querySelector('b').textContent = o.nombre;
    card.querySelector('.muted').textContent =
      `${new Date(o.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${n} ${n === 1 ? 'prenda' : 'prendas'}`;
    card.querySelector('[data-a=probar]').onclick = () => probarOutfit(o.prendas);
    card.querySelector('[data-a=renombrar]').onclick = async () => {
      const nombre = await pedir('Nuevo nombre:', o.nombre);
      if (!nombre?.trim()) return;
      await db.put('outfits', { ...o, nombre: nombre.trim() });
      renderOutfits();
    };
    card.querySelector('[data-a=eliminar]').onclick = async () => {
      if (!await confirmar(`¿Eliminar «${o.nombre}»? Las prendas no se borran.`)) return;
      await db.del('outfits', o.id);
      renderOutfits();
    };
    return card;
  }));
  document.querySelector('#outfits-empty').hidden = outfits.length > 0;
}
