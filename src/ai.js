// OpenRouter: the only thing in the app that leaves the device.
import { settings } from './settings.js';

export const CATEGORIES = ['Cabeza', 'Parte de arriba', 'Capa exterior', 'Parte de abajo', 'Calzado', 'Accesorios'];
export const SEASONS = ['Todo el año', 'Verano', 'Invierno', 'Entretiempo'];

async function openrouter(body, path = 'chat/completions') {
  if (!settings.apiKey) throw new Error('Falta la clave de OpenRouter (Ajustes).');
  const res = await fetch(`https://openrouter.ai/api/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Armario Digital' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Error ${res.status}`);
  return path === 'images' ? data : data.choices[0].message;
}

/** Chat completion with the chat model (tools allowed). Returns the assistant message. */
export const chat = (messages, tools) => openrouter({ model: settings.modelChat, messages, tools });

// Chroma background (not white) so the local cut-out also works for white clothes.
const CATALOG_PROMPT =
  'E-commerce catalog product photo, like a Zara or Bershka online store. Take the garment or accessory from this photo ' +
  'and show it alone, centered, front view, neatly laid out (ghost mannequin style for clothes), on a perfectly flat solid ' +
  'pure chroma-key green background (#00FF00), even studio lighting, no shadow, no gradient, the item must not touch the image edges. ' +
  'If the item itself is green, use a solid pure magenta background (#FF00FF) instead. Keep the EXACT same item: same color, ' +
  'fabric, texture, prints, logos and proportions. No person, no hanger, no props, no text.';

/** dataURL photo → dataURL of the item, catalog style, on a chroma background. */
export async function fotoCatalogo(photo) {
  // Image-only models use /images (not chat). Edit = prompt + input_references.
  const data = await openrouter({
    model: settings.modelImage,
    prompt: CATALOG_PROMPT,
    aspect_ratio: '3:4',
    output_format: 'png',
    input_references: [{ type: 'image_url', image_url: { url: photo } }],
  }, 'images');
  const img = data.data?.[0];
  if (img?.b64_json) return `data:${img.media_type || 'image/png'};base64,${img.b64_json}`;
  if (img?.url) return img.url;
  throw new Error('El modelo no devolvió imagen.');
}

/** dataURL image → { categoria, tipo, color, estilo, temporada, descripcion } */
export async function tag(image) {
  const prompt =
    'Eres un etiquetador de ropa para un armario digital. Mira la prenda y responde SOLO con un JSON con estas claves:\n' +
    `"categoria": una de ${JSON.stringify(CATEGORIES)} (gorras y sombreros = "Cabeza"; camisetas, camisas, sudaderas, jerséis y chalecos = "Parte de arriba"; chaquetas, abrigos y cazadoras = "Capa exterior"; pantalones, faldas y shorts = "Parte de abajo"; collares, relojes, gafas, cinturones, bolsos = "Accesorios"),\n` +
    '"tipo": nombre corto de la prenda (ej. "Sudadera con capucha"),\n' +
    '"color": color principal en español,\n' +
    '"estilo": ej. casual, deportivo, elegante, streetwear,\n' +
    `"temporada": una de ${JSON.stringify(SEASONS)},\n` +
    '"descripcion": una frase breve (material, detalles, estampado).';
  const msg = await openrouter({
    model: settings.modelTag,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }] }],
  });
  const json = msg.content?.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('Respuesta sin JSON.');
  const t = JSON.parse(json);
  if (!CATEGORIES.includes(t.categoria)) t.categoria = 'Accesorios';
  if (!SEASONS.includes(t.temporada)) t.temporada = SEASONS[0];
  return t;
}
