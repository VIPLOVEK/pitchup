// WMO weather code → emoji
const WMO = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌧️', 81: '🌧️', 82: '🌧️',
  85: '❄️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

// Module-level cache so multiple slots at the same location share one fetch
const cache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function fetchWeatherForLocation(lat, lon) {
  const key = `${lat},${lon}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m` +
    `&timezone=UTC&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=16`

  const res = await fetch(url)
  if (!res.ok) throw new Error('weather fetch failed')
  const data = await res.json()
  cache.set(key, { data, ts: Date.now() })
  return data
}

export function getWeatherForSlot(data, isoDatetime) {
  if (!data) return null
  const target = new Date(isoDatetime).getTime()
  const times = data.hourly.time // UTC strings e.g. "2024-06-16T22:00"

  let closest = 0, minDiff = Infinity
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t + 'Z').getTime() - target)
    if (diff < minDiff) { minDiff = diff; closest = i }
  })

  // Slot is outside the 16-day forecast window
  if (minDiff > 12 * 60 * 60 * 1000) return null

  const temp = Math.round(data.hourly.temperature_2m[closest])
  const apparent = Math.round(data.hourly.apparent_temperature?.[closest] ?? temp)
  const precip = data.hourly.precipitation_probability?.[closest] ?? 0
  const code = data.hourly.weather_code?.[closest] ?? 0
  const wind = Math.round(data.hourly.wind_speed_10m?.[closest] ?? 0)
  const emoji = WMO[code] ?? '🌡️'

  return { temp, apparent, precip, code, wind, emoji }
}

// Returns a human-readable condition + planning tip based on all weather signals.
// severity: 'good' | 'ok' | 'caution' | 'bad'
export function getCondition({ temp, apparent, precip, code, wind }) {
  const feel = apparent ?? temp

  // Storms and snow override everything
  if (code >= 95) return { label: 'Thunderstorms', tip: 'Game may be called off', severity: 'bad', emoji: '⛈️' }
  if (code >= 71 && code <= 86) return { label: 'Snow expected', tip: 'Pitch may be closed', severity: 'bad', emoji: '❄️' }

  // Heavy rain
  if (precip >= 60 || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    return { label: 'Rain likely', tip: 'Expect a wet pitch', severity: 'bad', emoji: '🌧️' }
  }
  // Light rain / drizzle
  if (precip >= 30 || (code >= 51 && code <= 55)) {
    return { label: 'Rain possible', tip: 'Bring dry kit', severity: 'caution', emoji: '🌦️' }
  }

  // Temperature extremes (use apparent/feels-like)
  if (feel >= 95) return { label: 'Dangerously hot', tip: 'Bring plenty of water', severity: 'bad', emoji: '🥵' }
  if (feel >= 88) return { label: 'Hot', tip: 'Stay hydrated', severity: 'caution', emoji: '🥵' }
  if (feel <= 28) return { label: 'Freezing', tip: 'Dress in layers', severity: 'bad', emoji: '🥶' }
  if (feel <= 42) return { label: 'Cold', tip: 'Dress in layers', severity: 'caution', emoji: '🥶' }

  // Wind
  if (wind >= 25) return { label: 'Very windy', tip: 'Ball control will be tricky', severity: 'caution', emoji: '💨' }
  if (wind >= 18) return { label: 'Windy', tip: 'Ball will move in the air', severity: 'caution', emoji: '💨' }

  // Clear skies — distinguish warm, perfect, mild
  if (code <= 2) {
    if (feel >= 75 && feel < 88) return { label: 'Warm & sunny', tip: 'Bring water', severity: 'good', emoji: '☀️' }
    if (feel >= 60) return { label: 'Perfect conditions', tip: null, severity: 'good', emoji: '☀️' }
    return { label: 'Clear & cool', tip: null, severity: 'ok', emoji: '🌤️' }
  }

  // Overcast / cloudy
  if (code === 3) return { label: 'Overcast', tip: null, severity: 'ok', emoji: '☁️' }
  if (code === 2) return { label: 'Partly cloudy', tip: null, severity: 'ok', emoji: '⛅' }

  return { label: 'Cloudy', tip: null, severity: 'ok', emoji: '☁️' }
}
