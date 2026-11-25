// Weather: Open-Meteo (free, no key). Daily forecast up to 16 days ahead.

const WMO = [
  [0, 'despejado'], [1, 'mayormente despejado'], [2, 'parcialmente nuboso'], [3, 'nublado'],
  [48, 'niebla'], [57, 'llovizna'], [67, 'lluvia'], [77, 'nieve'], [82, 'chubascos'], [86, 'chubascos de nieve'], [99, 'tormenta'],
];
const describe = code => WMO.find(([max]) => code <= max)?.[1] ?? 'variable';

/** (ciudad, 'YYYY-MM-DD') → resumen del día */
export async function consultarTiempo(ciudad, fecha) {
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&name=${encodeURIComponent(ciudad)}`)).json();
  const lugar = geo.results?.[0];
  if (!lugar) return { error: `No encuentro la ciudad «${ciudad}».` };
  const q = new URLSearchParams({
    latitude: lugar.latitude, longitude: lugar.longitude, timezone: 'auto', forecast_days: 16,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max',
  });
  const d = (await (await fetch(`https://api.open-meteo.com/v1/forecast?${q}`)).json()).daily;
  const i = d?.time.indexOf(fecha) ?? -1;
  if (i < 0) return { error: `Solo hay previsión de ${d?.time[0]} a ${d?.time.at(-1)}.` };
  return {
    ciudad: `${lugar.name}${lugar.admin1 ? ', ' + lugar.admin1 : ''}`, fecha,
    cielo: describe(d.weather_code[i]),
    max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]),
    lluvia: d.precipitation_probability_max[i], viento: Math.round(d.wind_speed_10m_max[i]),
  };
}
