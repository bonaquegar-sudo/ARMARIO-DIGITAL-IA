// Outfits: saved combinations, shown as mini mannequins. Tap one to see it enlarged.
import * as db from './db.js';
import { aviso, confirmar, pedir } from './ui.js';
import { SLOTS, ponerOutfit } from './probador.js';

const grid = document.querySelector('#outfits-grid');
const dlg = document.querySelector('#outfit-ver');
let urls = [];
let dlgUrls = [];

/** Mini mannequin for an outfit. Created object URLs are pushed into `urls` (caller revokes). */
export function miniOutfit(prendas, byId, urls) {
  const mini = Object.assign(document.createElement('button'), { className: 'mini', ariaLabel: 'Ver outfit' });
  for (const { key } of SLOTS) {
    const it = byId.get(prendas[key]);
    if (!it) continue; // deleted items just vanish
    const src = URL.createObjectURL(it.image);
    urls.push(src);
    mini.append(Object.assign(document.createElement('img'), { src, alt: it.tipo || '', style: `grid-area:${key}` }));
  }
  return mini;
}

const resumen = (o, byId) => {
  const n = SLOTS.filter(s => byId.has(o.prendas[s.key])).length;
  return `${new Date(o.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${n} ${n === 1 ? 'prenda' : 'prendas'}`;
};

/** Enlarged view of a saved outfit (from the Outfits grid or the chat). */
export async function verOutfit(id) {
  const [outfits, items] = await Promise.all([db.all('outfits'), db.all('items')]);
  const o = outfits.find(x => x.id === id);
  if (!o) return aviso('Este outfit ya no existe.');
  const byId = new Map(items.map(i => [i.id, i]));
  dlgUrls.forEach(URL.revokeObjectURL);
  dlgUrls = [];
  dlg.querySelector('.ver-mini').replaceChildren(miniOutfit(o.prendas, byId, dlgUrls));
  dlg.querySelector('b').textContent = o.nombre;
  dlg.querySelector('.muted').textContent = resumen(o, byId);
  dlg.querySelector('[data-a=editar]').onclick = () => {
    dlg.close();
    ponerOutfit(o.prendas, o); // edits this outfit in place
    document.querySelector('[data-view=probador]').click();
  };
  dlg.querySelector('[data-a=renombrar]').onclick = async () => {
    const nombre = await pedir('Nuevo nombre:', o.nombre);
    if (!nombre?.trim()) return;
    o.nombre = nombre.trim();
    await db.put('outfits', o);
    dlg.querySelector('b').textContent = o.nombre;
    renderOutfits();
  };
  dlg.querySelector('[data-a=eliminar]').onclick = async () => {
    if (!await confirmar(`¿Eliminar «${o.nombre}»? Las prendas no se borran.`)) return;
    await db.del('outfits', o.id);
    dlg.close();
    renderOutfits();
  };
  if (!dlg.open) dlg.showModal();
}
dlg.querySelector('[data-a=cerrar]').onclick = () => dlg.close();
dlg.onclick = e => { // tap on the backdrop (outside the box) closes
  const r = dlg.getBoundingClientRect();
  if (e.target === dlg && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dlg.close();
};

export async function renderOutfits() {
  const [outfits, items] = await Promise.all([db.all('outfits'), db.all('items')]);
  const byId = new Map(items.map(i => [i.id, i]));
  urls.forEach(URL.revokeObjectURL);
  urls = [];
  outfits.sort((a, b) => b.createdAt - a.createdAt);

  grid.replaceChildren(...outfits.map((o, i) => {
    const card = document.createElement('article');
    card.className = 'outfit';
    card.style.setProperty('--i', i);
    card.innerHTML = '<div class="outfit-info"><div><b></b><span class="muted small"></span></div></div>';
    const mini = miniOutfit(o.prendas, byId, urls);
    mini.onclick = () => verOutfit(o.id);
    card.prepend(mini);
    card.querySelector('b').textContent = o.nombre;
    card.querySelector('.muted').textContent = resumen(o, byId);
    return card;
  }));
  document.querySelector('#outfits-empty').hidden = outfits.length > 0;
}
