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

  grid.replaceChildren(...outfits.map((o, i) => {
    const n = SLOTS.filter(s => byId.has(o.prendas[s.key])).length;
    const card = document.createElement('article');
    card.className = 'outfit';
    card.style.setProperty('--i', i);
    // Tap the mannequin to try it on; pencil renames, bin deletes.
    card.innerHTML = `
      <div class="outfit-info"><div><b></b><span class="muted small"></span></div>
        <button data-a="renombrar" class="icon" aria-label="Renombrar"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
        <button data-a="eliminar" class="icon" aria-label="Eliminar"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
      </div>`;
    card.prepend(miniOutfit(o.prendas, byId, urls));
    card.querySelector('b').textContent = o.nombre;
    card.querySelector('.muted').textContent =
      `${new Date(o.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${n} ${n === 1 ? 'prenda' : 'prendas'}`;
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
