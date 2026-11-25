// Chat: a stylist that knows the wardrobe, checks the weather and saves outfits.
import * as db from './db.js';
import { confirmar } from './ui.js';
import * as ai from './ai.js';
import { consultarTiempo } from './tiempo.js';
import { SLOTS } from './probador.js';
import { miniOutfit, probarOutfit } from './outfits.js';

const $ = s => document.querySelector(s);
const log = $('#chat-log');
// OpenAI-format history (user / assistant / tool), kept on this device.
// ponytail: whole history is sent every turn; "Nueva" resets it. Trim when chats get long.
let hist = JSON.parse(localStorage.getItem('chat') || '[]');
const save = () => localStorage.setItem('chat', JSON.stringify(hist));
let urls = [];

const TOOLS = [
  { type: 'function', function: {
    name: 'consultar_tiempo',
    description: 'Previsión del tiempo de un día en una ciudad (hasta 16 días vista).',
    parameters: { type: 'object', required: ['ciudad', 'fecha'], properties: {
      ciudad: { type: 'string', description: 'Ciudad, p. ej. "Málaga"' },
      fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
    } },
  } },
  { type: 'function', function: {
    name: 'guardar_outfit',
    description: 'Guarda un outfit con prendas del armario (por id). Cada zona admite solo prendas de su categoría; deja vacías las zonas que no uses.',
    parameters: { type: 'object', required: ['nombre', 'prendas'], properties: {
      nombre: { type: 'string', description: 'Nombre corto, p. ej. "Málaga jueves"' },
      prendas: { type: 'object', properties: Object.fromEntries(SLOTS.map(s => [s.key, { type: 'string', description: `id de una prenda de «${s.cat}»` }])) },
    } },
  } },
];

async function sistema() {
  const [items, outfits] = await Promise.all([db.all('items'), db.all('outfits')]);
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const iso = d => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
  const prendas = items.map(i => ({ id: i.id, categoria: i.categoria, tipo: i.tipo, color: i.color, estilo: i.estilo, temporada: i.temporada, descripcion: i.descripcion }));
  const guardados = outfits.map(o => ({ nombre: o.nombre, prendas: Object.values(o.prendas).filter(Boolean) }));
  return `Eres el estilista personal de esta persona y conoces su armario. Responde en español, breve, cercano y concreto.
Hoy es ${fecha} (${iso(hoy)}).
Zonas de un outfit → categoría: ${SLOTS.map(s => `${s.key} → ${s.cat}`).join('; ')}.
Reglas:
- Usa SOLO prendas del armario, por su id. Si falta algo (p. ej. no hay abrigo y hace frío), dilo.
- Si piden un outfit para un día y lugar, llama antes a consultar_tiempo y tenlo en cuenta (capas si hace frío, nada de ante si llueve…).
- Cuando creen o pidan un outfit, guárdalo con guardar_outfit y después explica en 2-4 frases por qué funciona, mencionando el tiempo si lo consultaste.
- No inventes ids ni muestres ids al usuario; nombra las prendas por tipo y color.
Armario (${prendas.length} prendas): ${JSON.stringify(prendas)}
Outfits guardados: ${JSON.stringify(guardados)}`;
}

async function ejecutar(name, args) {
  if (name === 'consultar_tiempo') return consultarTiempo(args.ciudad || '', args.fecha || '');
  if (name === 'guardar_outfit') {
    const items = new Map((await db.all('items')).map(i => [i.id, i]));
    const prendas = {};
    for (const s of SLOTS) {
      const id = args.prendas?.[s.key];
      if (!id) { prendas[s.key] = null; continue; }
      const it = items.get(id);
      if (!it) return { error: `No existe la prenda ${id}.` };
      if (it.categoria !== s.cat) return { error: `${it.tipo} es «${it.categoria}», no puede ir en ${s.key}.` };
      prendas[s.key] = id;
    }
    if (!Object.values(prendas).some(Boolean)) return { error: 'El outfit está vacío.' };
    const outfit = { id: db.newId(), nombre: (args.nombre || 'Outfit').trim(), createdAt: Date.now(), prendas };
    await db.put('outfits', outfit);
    return { ok: true, ...outfit };
  }
  return { error: `Herramienta desconocida: ${name}` };
}

// Minimal formatting: escape, **bold**, *italic*, line breaks (CSS pre-wrap).
const fmt = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>');

export async function renderChat() {
  const byId = new Map((await db.all('items')).map(i => [i.id, i]));
  urls.forEach(URL.revokeObjectURL);
  urls = [];
  log.replaceChildren(...hist.flatMap(m => {
    if (m.role === 'user') return [Object.assign(document.createElement('p'), { className: 'msg user', textContent: m.content })];
    if (m.role === 'assistant') return m.content?.trim() ? [Object.assign(document.createElement('p'), { className: 'msg bot', innerHTML: fmt(m.content.trim()) })] : [];
    const r = JSON.parse(m.content);
    if (m.name === 'consultar_tiempo' && !r.error)
      return [Object.assign(document.createElement('p'), { className: 'msg info', textContent: `${r.ciudad} · ${r.fecha}: ${r.cielo}, ${r.min}–${r.max} °C, lluvia ${r.lluvia} %, viento ${r.viento} km/h` })];
    if (m.name === 'guardar_outfit' && r.ok) {
      const card = document.createElement('div');
      card.className = 'msg outfit-chat';
      card.append(miniOutfit(r.prendas, byId, urls));
      card.insertAdjacentHTML('beforeend', '<div class="row"><b></b><button class="push">Probar</button></div>');
      card.querySelector('b').textContent = `Guardado: ${r.nombre}`;
      card.querySelector('button.push').onclick = () => probarOutfit(r.prendas);
      return [card];
    }
    return [];
  }));
  $('#chat-empty').hidden = hist.length > 0;
  log.lastElementChild?.scrollIntoView({ block: 'end' });
}

function setBusy(on, texto = 'Pensando…') {
  $('#chat-status').textContent = texto;
  $('#chat-status').hidden = !on;
  $('#chat-form button').disabled = on;
}

async function enviar(texto) {
  hist.push({ role: 'user', content: texto });
  save();
  await renderChat();
  setBusy(true);
  try {
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      const msg = await ai.chat([{ role: 'system', content: await sistema() }, ...hist], TOOLS);
      const calls = msg.tool_calls || [];
      hist.push({ role: 'assistant', content: msg.content || '',
        ...(calls.length && { tool_calls: calls }),
        ...(msg.reasoning_details && { reasoning_details: msg.reasoning_details }) });
      save();
      if (!calls.length) break;
      for (const c of calls) {
        let args = {};
        try { args = JSON.parse(c.function.arguments || '{}'); } catch { /* model sent bad JSON: tool reports the error */ }
        setBusy(true, c.function.name === 'consultar_tiempo' ? `Mirando el tiempo en ${args.ciudad || '…'}…` : 'Guardando el outfit…');
        const result = await ejecutar(c.function.name, args).catch(e => ({ error: e.message }));
        hist.push({ role: 'tool', tool_call_id: c.id, name: c.function.name, content: JSON.stringify(result) });
        save();
      }
      await renderChat();
      setBusy(true);
    }
  } catch (e) {
    log.append(Object.assign(document.createElement('p'), { className: 'msg info', textContent: 'Error: ' + e.message }));
  }
  setBusy(false);
  await renderChat();
}

$('#chat-form').onsubmit = e => {
  e.preventDefault();
  const input = $('#chat-input');
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  enviar(texto);
};
$('#chat-nuevo').onclick = async () => {
  if (hist.length && !await confirmar('¿Empezar una conversación nueva? Los outfits guardados se mantienen.')) return;
  hist = [];
  save();
  renderChat();
};
