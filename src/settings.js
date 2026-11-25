// Settings live in localStorage on this device only (never in backups).
export const DEFAULTS = {
  apiKey: '',
  modelImage: 'black-forest-labs/flux-3-image-klein',
  modelTag: 'qwen/qwen3.6-35b-a3b',
  modelChat: 'deepseek/deepseek-v4.1-flash',
  theme: 'auto',
};
export const settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('ajustes') || '{}') };
export const saveSettings = () => localStorage.setItem('ajustes', JSON.stringify(settings));
