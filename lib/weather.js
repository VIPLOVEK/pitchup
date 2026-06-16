// WMO weather-code → emoji
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
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&timezone=UTC&temperature_unit=fahrenheit&forecast_days=16`

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
  const precip = data.hourly.precipitation_probability?.[closest] ?? 0
  const code = data.hourly.weather_code?.[closest] ?? 0
  const emoji = WMO[code] ?? '🌡️'

  return { temp, precip, emoji }
}
