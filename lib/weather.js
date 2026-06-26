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
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes — shorter TTL for same-day games

export async function fetchWeatherForLocation(lat, lon) {
  const key = `${lat},${lon}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data

  // timezone=auto returns times in the location's local timezone with utc_offset_seconds,
  // giving accurate per-location DST handling.
  // current= fetches live current conditions alongside the hourly forecast.
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m` +
    `&current=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m` +
    `&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=16`

  const res = await fetch(url)
  if (!res.ok) throw new Error('weather fetch failed')
  const data = await res.json()
  cache.set(key, { data, ts: Date.now() })
  return data
}

export function getWeatherForSlot(data, isoDatetime) {
  if (!data) return null

  const target = new Date(isoDatetime).getTime()
  const now = Date.now()
  const hoursUntilGame = (target - now) / (1000 * 60 * 60)

  // If game is within 90 minutes, use live current conditions
  if (Math.abs(hoursUntilGame) < 1.5 && data.current) {
    const c = data.current
    const temp = Math.round(c.temperature_2m)
    const apparent = Math.round(c.apparent_temperature ?? temp)
    const precip = c.precipitation_probability ?? 0
    const code = c.weather_code ?? 0
    const wind = Math.round(c.wind_speed_10m ?? 0)
    return { temp, apparent, precip, code, wind, emoji: WMO[code] ?? '🌡️', isCurrent: true }
  }

  // For future/past slots, find the matching hourly forecast.
  // With timezone=auto, API times are local; utc_offset_seconds converts them to UTC.
  const offsetMs = (data.utc_offset_seconds ?? 0) * 1000
  const times = data.hourly.time // local time strings e.g. "2024-06-16T18:00"

  let closest = 0, minDiff = Infinity
  times.forEach((t, i) => {
    // Append 'Z' to treat the string as UTC, then subtract the location offset to get true UTC
    const tUtc = new Date(t + 'Z').getTime() - offsetMs
    const diff = Math.abs(tUtc - target)
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

// Returns 4 hourly snapshots: [-1h, kickoff, +1h, +2h] around the game time.
// Used to show a mini timeline strip on the poll card.
export function getWeatherTimeline(data, isoDatetime) {
  if (!data?.hourly?.time) return []

  const target = new Date(isoDatetime).getTime()
  const offsetMs = (data.utc_offset_seconds ?? 0) * 1000
  const times = data.hourly.time

  let centerIdx = 0, minDiff = Infinity
  times.forEach((t, i) => {
    const tUtc = new Date(t + 'Z').getTime() - offsetMs
    const diff = Math.abs(tUtc - target)
    if (diff < minDiff) { minDiff = diff; centerIdx = i }
  })

  if (minDiff > 12 * 60 * 60 * 1000) return []

  return [-1, 0, 1, 2].map(offset => {
    const idx = centerIdx + offset
    if (idx < 0 || idx >= times.length) return null
    const tUtc = new Date(times[idx] + 'Z').getTime() - offsetMs
    const code = data.hourly.weather_code?.[idx] ?? 0
    const temp = Math.round(data.hourly.temperature_2m?.[idx] ?? 0)
    const precip = data.hourly.precipitation_probability?.[idx] ?? 0
    const precipMm = Math.round((data.hourly.precipitation?.[idx] ?? 0) * 10) / 10
    return {
      timeLabel: new Date(tUtc).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'America/New_York' }),
      emoji: WMO[code] ?? '🌡️',
      temp,
      precip,
      precipMm,
      isKickoff: offset === 0,
    }
  }).filter(Boolean)
}

// Returns a human-readable condition + planning tip based on all weather signals.
// severity: 'good' | 'ok' | 'caution' | 'bad'
export function getCondition({ temp, apparent, precip, code, wind }) {
  const feel = apparent ?? temp

  // Storms and snow override everything
  if (code >= 95) return { label: 'Thunderstorms', tip: 'Game may be called off', severity: 'bad', emoji: '⛈️' }
  // 71-77: snowfall / snow grains; 85-86: snow showers — 80-82 are rain showers, not snow
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow expected', tip: 'Pitch may be closed', severity: 'bad', emoji: '❄️' }

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
