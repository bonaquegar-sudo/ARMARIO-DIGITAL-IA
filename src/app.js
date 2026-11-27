import * as db from './db.js';
import { aviso, confirmar } from './ui.js';
import * as ai from './ai.js';
import { settings, saveSettings, DEFAULTS } from './settings.js';
import { toJpeg, quitarFondo, blobToDataURL } from './imagen.js';
import { renderProbador, guardarOutfit } from './probador.js';
import { renderOutfits } from './outfits.js';
import { renderChat } from './chat.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// --- Theme ---
function applyTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  $$('#theme button').forEach(b => b.classList.toggle('on', b.dataset.theme === t));
}

// --- Navigation ---
function show(view) {
  $$('.view').forEach(v => v.hidden = v.id !== view);
  $$('#tabs button').forEach((b, n) => {
    b.classList.toggle('on', b.dataset.view === view);
    if (b.dataset.view === view) $('#tabs > div').style.setProperty('--i', n);
  });
  localStorage.setItem('vista', view);
  if (view === 'armario') renderArmario();
  if (view === 'probador') renderProbador();
  if (view === 'outfits') renderOutfits();
  if (view === 'chat') renderChat();
  if (view === 'ajustes') renderBackupInfo();
  scrollTo(0, 0);
}

// --- Armario ---
let urls = [];
let filtro = 'Todo';
async function renderArmario() {
  const all = (await db.all('items')).sort((a, b) => b.createdAt - a.createdAt);
  const items = filtro === 'Todo' ? all : all.filter(i => i.categoria === filtro);
  urls.forEach(URL.revokeObjectURL);
  urls = items.map(i => URL.createObjectURL(i.image));
  $('#armario-grid').replaceChildren(...pendientes.map(tarjetaPendiente), ...items.map((item, n) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.innerHTML = `<div class="pic"><img loading="lazy"></div><span></span>`;
    b.style.setProperty('--i', n);
    const img = b.querySelector('img');
    img.onload = () => img.classList.add('ok');
    img.src = urls[n];
    b.querySelector('span').textContent = item.tipo || item.categoria;
    b.onclick = () => abrirPrenda(item);
    return b;
  }));
  $('#armario-count').textContent = all.length ? `${all.length} ${all.length === 1 ? "prenda" : "prendas"}` : '';
  $('#armario-empty').hidden = items.length + pendientes.length > 0;
  $('#armario-empty').textContent = all.length ? 'Nada en esta categoría.' : 'Tu armario está vacío. Pulsa «Añadir» para hacer una foto.';
  $$('#filtros button').forEach(b => b.classList.toggle('on', b.dataset.cat === filtro));
}

// --- Prenda: add (photo → white background → tags) and edit ---
const FIELDS = ['categoria', 'tipo', 'color', 'estilo', 'temporada', 'descripcion'];
let draft = null;   // { id?, createdAt?, original?: dataURL, image: Blob }
let run = 0;        // ignores AI results that arrive after the dialog closed

function setImage(blob) {
  const img = $('#prenda-img');
  URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(blob);
  img.classList.remove('aparece');
  void img.offsetWidth; // restart the reveal animation
  img.classList.add('aparece');
}
const setStatus = (t, error = false) => {
  const el = $('#prenda-status');
  el.textContent = t;
  el.hidden = !t;
  el.classList.toggle('shimmer', !error);
};
const scanning = on => $('#prenda .foto').classList.toggle('procesando', on);
const setBusy = on => $$('#prenda-form :is(button, select, input):not(#prenda-cancel)').forEach(e => e.disabled = on);
const fillForm = t => FIELDS.forEach(f => { if (t[f] != null) $(`#prenda-form [name=${f}]`).value = t[f]; });

function abrirPrenda(item) {
  run++;
  draft = { ...item };
  $('#prenda-form').reset();
  fillForm(item);
  setImage(item.image);
  setStatus('');
  setBusy(false);
  $('#prenda-delete').hidden = false;
  $('#prenda-retry').hidden = $('#prenda-original').hidden = true;
  $('#prenda').showModal();
}

async function nuevaPrenda(file) {
  const id = ++run;
  const photo = await toJpeg(file, 1024);
  draft = { original: await blobToDataURL(photo), image: photo };
  $('#prenda-form').reset();
  setImage(photo);
  $('#prenda-delete').hidden = true;
  $('#prenda-retry').hidden = $('#prenda-original').hidden = false;
  $('#prenda').showModal();
  await procesar(id, true);
}

// The AI pipeline, shared by the one-garment dialog and "add several".
async function catalogo(original, status) {
  status('Creando foto de catálogo…');
  const url = await ai.fotoCatalogo(original);
  status('Quitando el fondo…');
  const png = await quitarFondo(await (await fetch(url)).blob());
  if (!png) throw new Error('No se pudo quitar el fondo. Pulsa Reintentar o usa la foto original.');
  return png;
}
// Tag a copy on white: a transparent PNG can read as black to the model.
const etiquetar = async image => ai.tag(await blobToDataURL(await toJpeg(image, 1024)));

// Several photos at once: each becomes a card that processes in the grid and saves itself.
let pendientes = [];
async function anadirVarias(files) {
  const nuevas = files.map(file => ({ file, estado: 'En cola…', thumb: URL.createObjectURL(file) }));
  pendientes.push(...nuevas);
  filtro = 'Todo';
  renderArmario();
  const una = async p => {
    try {
      const photo = await toJpeg(p.file, 1024);
      const image = await catalogo(await blobToDataURL(photo), t => pintarPendiente(p, t));
      pintarPendiente(p, 'Clasificando…');
      const tags = await etiquetar(image);
      const item = { id: db.newId(), createdAt: Date.now(), image };
      FIELDS.forEach(f => item[f] = String(tags[f] ?? '').trim());
      await db.put('items', item);
      pendientes = pendientes.filter(x => x !== p);
      URL.revokeObjectURL(p.thumb);
    } catch (e) {
      p.error = e.message;
      p.estado = 'Error · toca para revisar';
    }
    renderArmario();
  };
  // ponytail: 2 at a time to stay friendly with the API; raise if it holds up.
  const cola = [...nuevas];
  await Promise.all([0, 1].map(async () => { while (cola.length) await una(cola.shift()); }));
}
function pintarPendiente(p, estado) {
  p.estado = estado;
  const span = p.el?.querySelector('span');
  if (span) span.textContent = estado;
}
function tarjetaPendiente(p) {
  const b = document.createElement('button');
  b.className = 'card pendiente' + (p.error ? ' error' : '');
  b.innerHTML = `<div class="pic foto${p.error ? '' : ' procesando'}"><img><i class="scan"></i></div><span></span>`;
  const img = b.querySelector('img');
  img.onload = () => img.classList.add('ok');
  img.src = p.thumb;
  b.querySelector('span').textContent = p.estado;
  // A failed one opens the normal dialog, where it can be retried or saved with its original photo.
  b.onclick = () => {
    if (!p.error) return;
    pendientes = pendientes.filter(x => x !== p);
    URL.revokeObjectURL(p.thumb);
    renderArmario();
    nuevaPrenda(p.file);
  };
  p.el = b;
  return b;
}

async function procesar(id, fondo) {
  setBusy(true);
  try {
    if (fondo) {
      scanning(true);
      setStatus('Creando foto de catálogo…');
      const png = await catalogo(draft.original, t => id === run && setStatus(t));
      if (id !== run) return;
      draft.image = png;
      scanning(false);
      setImage(draft.image);
    }
    setStatus('Clasificando…');
    const tags = await etiquetar(draft.image);
    if (id !== run) return;
    fillForm(tags);
    setStatus('');
  } catch (e) {
    if (id === run) setStatus(e.message, true);
  } finally {
    if (id === run) { setBusy(false); scanning(false); }
  }
}

async function guardarPrenda(e) {
  e.preventDefault();
  const form = new FormData($('#prenda-form'));
  const item = { id: draft.id || db.newId(),
    createdAt: draft.createdAt || Date.now(), image: draft.image };
  FIELDS.forEach(f => item[f] = (form.get(f) || '').trim());
  await db.put('items', item);
  cerrarPrenda();
  renderArmario();
}

function cerrarPrenda() { run++; draft = null; scanning(false); $('#prenda').close(); }

async function borrarPrenda() {
  if (!await confirmar('¿Eliminar esta prenda?')) return;
  await db.del('items', draft.id);
  cerrarPrenda();
  renderArmario();
}

// --- Backup ---
async function renderBackupInfo() {
  const [items, outfits] = await Promise.all([db.all('items'), db.all('outfits')]);
  $('#backup-info').textContent = `${items.length} prendas · ${outfits.length} outfits en este dispositivo.`;
}

async function exportar() {
  const btn = $('#export');
  btn.disabled = true;
  try {
    const blob = await db.exportBackup();
    const nombre = `armario-${new Date().toISOString().slice(0, 10)}.armario`;
    if (window.__TAURI__) {
      // App (Windows / iPad): the Rust side writes it where the other device can reach it.
      const ruta = await window.__TAURI__.core.invoke('guardar_copia', { nombre, datos: await blob.text() });
      const donde = ruta.includes('iCloudDrive') ? 'en iCloud Drive' : /^\/(private|var)/.test(ruta)
        ? 'en Archivos → En mi iPad → Armario Digital' : 'en Documentos';
      aviso(`Copia guardada ${donde}:\n${nombre}`);
    } else {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    }
  } catch (e) { aviso('No se pudo exportar: ' + (e.message || e)); }
  btn.disabled = false;
}

async function importar(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !await confirmar('Esto sustituirá todo el armario de este dispositivo por el de la copia. ¿Continuar?')) return;
  try {
    const data = await db.importBackup(file);
    aviso(`Importado: ${data.items.length} prendas y ${data.outfits.length} outfits.`);
    renderBackupInfo();
  } catch (err) { aviso(err.message); }
}

// --- Init ---
$$('[data-setting]').forEach(input => {
  input.value = settings[input.dataset.setting];
  input.addEventListener('change', () => {
    settings[input.dataset.setting] = input.value.trim() || DEFAULTS[input.dataset.setting];
    input.value = settings[input.dataset.setting];
    saveSettings();
  });
});
$$('#theme button').forEach(b => b.onclick = () => { settings.theme = b.dataset.theme; saveSettings(); applyTheme(b.dataset.theme); });
$$('#tabs button').forEach(b => b.onclick = () => show(b.dataset.view));
$('#filtros').replaceChildren(...['Todo', ...ai.CATEGORIES].map(cat => {
  const b = Object.assign(document.createElement('button'), { textContent: cat });
  b.dataset.cat = cat;
  b.onclick = () => { filtro = cat; renderArmario(); };
  return b;
}));
$('#prenda-form [name=categoria]').append(...ai.CATEGORIES.map(c => new Option(c)));
$('#prenda-form [name=temporada]').append(...ai.SEASONS.map(c => new Option(c)));
$('#add-input').onchange = e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length === 1) nuevaPrenda(files[0]);
  else if (files.length) anadirVarias(files);
};
$('#prenda-form').onsubmit = guardarPrenda;
$('#prenda-cancel').onclick = cerrarPrenda;
$('#prenda').oncancel = e => { e.preventDefault(); cerrarPrenda(); };
$('#prenda-delete').onclick = borrarPrenda;
$('#prenda-retry').onclick = () => procesar(++run, true);
$('#prenda-original').onclick = async () => {
  draft.image = await toJpeg(await (await fetch(draft.original)).blob());
  setImage(draft.image);
  procesar(++run, false);
};
$('#outfit-save').onclick = guardarOutfit;
$('#export').onclick = exportar;
$('#import').onchange = importar;

applyTheme(settings.theme);
show(localStorage.getItem('vista') || 'armario');

navigator.storage?.persist?.();
