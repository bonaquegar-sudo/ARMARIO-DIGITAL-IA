// In-app replacements for alert/confirm/prompt (native ones are unreliable in the iOS webview).
const dlg = document.createElement('dialog');
dlg.id = 'ui';
dlg.innerHTML = `<form><p></p><input hidden autocomplete="off"><div class="row">
  <button class="primary">Aceptar</button><button type="button">Cancelar</button></div></form>`;
document.body.append(dlg);
const [msg, input, cancel] = ['p', 'input', 'button[type=button]'].map(s => dlg.querySelector(s));

// Resolve on the actual button/keyboard action (the dialog 'close' event isn't reliable everywhere).
let done = null;
const finish = ok => { dlg.close(); done?.(ok); done = null; };
dlg.querySelector('form').onsubmit = e => { e.preventDefault(); finish(true); };
cancel.onclick = () => finish(false);
dlg.oncancel = e => { e.preventDefault(); finish(false); }; // Esc

function open(texto, { pedir = false, valor = '', cancelar = true } = {}) {
  done?.(false); // a previous dialog still open counts as cancelled
  msg.textContent = texto;
  input.hidden = !pedir;
  input.value = valor;
  cancel.hidden = !cancelar;
  if (!dlg.open) dlg.showModal();
  if (pedir) input.focus();
  return new Promise(res => done = res);
}

export const aviso = texto => open(texto, { cancelar: false });
export const confirmar = texto => open(texto);
/** Resolves to the typed text, or null if cancelled. */
export const pedir = async (texto, valor = '') => (await open(texto, { pedir: true, valor })) ? input.value : null;
