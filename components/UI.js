import { colors, radius } from '../lib/tokens'
import { useState, useEffect } from 'react'
import { fetchWeatherForLocation, getWeatherForSlot, getCondition } from '../lib/weather'

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, max }) {
  const pct = Math.min((value / max) * 100, 100)
  const full = pct >= 100
  const color = full ? colors.accent
    : pct >= 70 ? colors.grassLight
    : pct >= 35 ? colors.cardYellow
    : colors.danger
  return (
    <div style={{ position: 'relative', background: `rgba(255,255,255,0.06)`, borderRadius: radius.full, height: 6, margin: '12px 0 6px' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: full
          ? `linear-gradient(90deg, ${colors.accent}, #f4d060)`
          : color,
        borderRadius: radius.full,
        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: full ? `0 0 10px ${colors.accent}88` : `0 0 6px ${color}66`,
      }} />
      {full && (
        <span
          className="progress-ball"
          aria-hidden="true"
          style={{ position: 'absolute', right: -2, top: -9, fontSize: 14 }}
        >
          ⚽
        </span>
      )}
    </div>
  )
}

// ── Pill badge ────────────────────────────────────────────────────────────────
export function Pill({ color, children, className }) {
  return (
    <span className={className} style={{
      display: 'inline-block',
      background: color + '22',
      color,
      borderRadius: radius.full,
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
    }}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, highlight, style = {}, className }) {
  return (
    <div className={className} style={{
      position: 'relative',
      overflow: 'hidden',
      background: highlight
        ? 'linear-gradient(145deg, rgba(22, 46, 88, 0.95) 0%, rgba(14, 32, 64, 0.98) 100%)'
        : 'linear-gradient(145deg, rgba(20, 40, 72, 0.88) 0%, rgba(13, 30, 53, 0.92) 100%)',
      border: highlight
        ? `1px solid rgba(240, 192, 48, 0.28)`
        : '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 16,
      boxShadow: highlight
        ? `0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(240,192,48,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`
        : `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      ...style,
    }}>
      {highlight && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          width: 0, height: 0,
          borderStyle: 'solid',
          borderWidth: '0 40px 40px 0',
          borderColor: `transparent rgba(240,192,48,0.2) transparent transparent`,
        }} />
      )}
      {children}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
export function Label({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: colors.accent,
      marginBottom: 10,
      opacity: 0.9,
    }}>
      {children}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', small, disabled, full, style = {}, className }) {
  const isPrimary = variant === 'primary'
  const isDanger = variant === 'danger'
  const bg = isPrimary
    ? `linear-gradient(145deg, ${colors.accent} 0%, #d4960a 100%)`
    : isDanger
    ? colors.danger
    : 'rgba(255,255,255,0.05)'
  const col = isPrimary ? colors.pitch : colors.white
  const border = (!isPrimary && !isDanger) ? '1px solid rgba(255,255,255,0.1)' : 'none'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        background: bg,
        color: col,
        border,
        borderRadius: radius.md,
        padding: small ? '7px 14px' : '12px 20px',
        fontWeight: 700,
        fontSize: small ? 12 : 14,
        width: full ? '100%' : 'auto',
        letterSpacing: '0.01em',
        boxShadow: (!disabled && isPrimary)
          ? `0 4px 20px rgba(240,192,48,0.35), inset 0 1px 0 rgba(255,255,255,0.12)`
          : 'none',
        transition: 'box-shadow 0.2s ease, filter 0.15s ease, transform 0.1s ease',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', style = {}, ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
      style={{
        width: '100%',
        background: 'rgba(6, 13, 24, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: radius.md,
        color: colors.white,
        padding: '11px 14px',
        fontSize: 15,
        outline: 'none',
        marginBottom: 10,
        ...style,
      }}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        background: 'rgba(6, 13, 24, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: radius.md,
        color: colors.white,
        padding: '11px 14px',
        fontSize: 15,
        outline: 'none',
        marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </select>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div className="toast-pop" style={{
      position: 'fixed',
      bottom: 88,
      left: '50%',
      transform: 'translateX(-50%)',
      background: `linear-gradient(135deg, ${colors.accent} 0%, #d4960a 100%)`,
      color: colors.pitch,
      borderRadius: radius.md,
      padding: '12px 24px',
      fontWeight: 700,
      fontSize: 14,
      zIndex: 999,
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,192,48,0.3)`,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      {msg}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ label = 'Loading...' }) {
  return (
    <p style={{ color: colors.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="spinner-ball" aria-hidden="true">⚽</span> {label}
    </p>
  )
}

// ── Goal celebration ──────────────────────────────────────────────────────────
const CONFETTI_PIECES = ['⚽', '🎉', '⭐', '🟡', '🔴']

export function GoalCelebration() {
  return (
    <div className="goal-celebration" aria-hidden="true">
      {CONFETTI_PIECES.concat(CONFETTI_PIECES).map((piece, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: `${(i * 9) + 2}%`, animationDelay: `${i * 0.08}s` }}
        >
          {piece}
        </span>
      ))}
    </div>
  )
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────
export function Avatar({ name, src, size = 24 }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const hue = [...(name || '')].reduce((h, c) => h + c.charCodeAt(0), 0) % 360
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},40%,35%)`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: '#fff', lineHeight: 1,
    }}>
      {initials}
    </span>
  )
}

// ── Player chips ──────────────────────────────────────────────────────────────
export function PlayerChip({ name, onRemove, color, meta, avatar }) {
  const c = color || colors.grassLight
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: c + '18',
      border: `1px solid ${c}33`,
      borderRadius: radius.full,
      padding: '4px 10px 4px 4px',
      fontSize: 13,
      fontWeight: 600,
      color: colors.white,
      margin: 3,
    }}>
      <Avatar name={name} src={avatar} size={22} />
      {name}
      {meta && <span style={{ color: colors.muted, fontWeight: 500, fontSize: 11 }}>· {meta}</span>}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </span>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
export function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    try { await navigator.clipboard.writeText(text) } catch (_) {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      style={{
        background: 'none',
        border: `1px solid ${colors.grass}44`,
        borderRadius: radius.sm,
        color: copied ? colors.accent : colors.muted,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'color 0.15s',
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

// ── Weather badge ─────────────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  good:    '#22c55e',
  ok:      '#94a3b8',
  caution: '#f59e0b',
  bad:     '#ef4444',
}

export function WeatherBadge({ lat, lon, datetime }) {
  const [weather, setWeather] = useState(null)
  useEffect(() => {
    if (!lat || !lon || !datetime) return
    let cancelled = false
    fetchWeatherForLocation(lat, lon)
      .then(data => { if (!cancelled) setWeather(getWeatherForSlot(data, datetime)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lat, lon, datetime])
  if (!weather) return null

  const condition = getCondition(weather)
  const labelColor = SEVERITY_COLOR[condition.severity]
  const feelsDiff = Math.abs(weather.apparent - weather.temp) >= 5

  return (
    <span style={{
      display: 'block', marginTop: 4,
      background: labelColor + '18',
      border: `1px solid ${labelColor}33`,
      borderRadius: 6,
      padding: '3px 8px',
      fontSize: 11,
    }}>
      <span style={{ fontWeight: 700, color: labelColor }}>
        {condition.emoji} {condition.label}
      </span>
      <span style={{ color: '#94a3b8', marginLeft: 6 }}>
        {weather.isCurrent ? 'Now · ' : ''}{weather.temp}°F{feelsDiff ? ` · feels ${weather.apparent}°F` : ''}
        {weather.wind >= 10 ? ` · ${weather.wind} mph wind` : ''}
      </span>
      {condition.tip && (
        <span style={{ display: 'block', color: labelColor, opacity: 0.85, marginTop: 1 }}>
          ↳ {condition.tip}
        </span>
      )}
    </span>
  )
}
