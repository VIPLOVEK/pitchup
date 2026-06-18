import { colors, radius } from '../lib/tokens'
import { useState, useEffect } from 'react'
import { fetchWeatherForLocation, getWeatherForSlot, getCondition } from '../lib/weather'

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, max }) {
  const pct = Math.min((value / max) * 100, 100)
  const full = pct >= 100
  const color = full ? colors.accent : pct > 60 ? colors.grassLight : colors.grass
  return (
    <div style={{ position: 'relative', background: colors.pitchMid, borderRadius: radius.full, height: 8, margin: '12px 0 6px' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: color,
        borderRadius: radius.full,
        transition: 'width 0.4s ease',
        boxShadow: full ? `0 0 12px ${colors.accent}` : 'none',
      }} />
      {full && (
        <span
          className="progress-ball"
          aria-hidden="true"
          style={{ position: 'absolute', right: -2, top: -8, fontSize: 14 }}
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
      background: `linear-gradient(155deg, ${colors.pitchCard} 0%, ${colors.pitchMid} 100%)`,
      border: `1px solid ${highlight ? colors.accent + '55' : colors.grass + '22'}`,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 16,
      boxShadow: highlight
        ? `0 8px 28px ${colors.accent}1a, 0 2px 10px rgba(0,0,0,0.3)`
        : '0 2px 10px rgba(0,0,0,0.25)',
      ...style,
    }}>
      {highlight && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 36px 36px 0',
          borderColor: `transparent ${colors.accent}26 transparent transparent`,
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
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: colors.accent,
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', small, disabled, full, style = {} }) {
  const bg = variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : colors.pitchMid
  const col = variant === 'primary' ? colors.pitch : colors.white
  const border = variant === 'ghost' ? `1px solid ${colors.grass}44` : 'none'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: col,
        border,
        borderRadius: radius.md,
        padding: small ? '7px 14px' : '11px 20px',
        fontWeight: 700,
        fontSize: small ? 12 : 14,
        width: full ? '100%' : 'auto',
        transition: 'opacity 0.15s',
        letterSpacing: '0.01em',
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
        background: colors.pitchMid,
        border: `1px solid ${colors.grass}44`,
        borderRadius: radius.md,
        color: colors.white,
        padding: '10px 12px',
        fontSize: 14,
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
        background: colors.pitchMid,
        border: `1px solid ${colors.grass}44`,
        borderRadius: radius.md,
        color: colors.white,
        padding: '10px 12px',
        fontSize: 14,
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
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: colors.accent,
      color: colors.pitch,
      borderRadius: radius.md,
      padding: '12px 24px',
      fontWeight: 700,
      fontSize: 14,
      zIndex: 999,
      boxShadow: '0 4px 20px #0008',
      whiteSpace: 'nowrap',
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

// ── Player chips ──────────────────────────────────────────────────────────────
export function PlayerChip({ name, onRemove, color, meta }) {
  const c = color || colors.grassLight
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: c + '18',
      border: `1px solid ${c}33`,
      borderRadius: radius.full,
      padding: '4px 12px',
      fontSize: 13,
      fontWeight: 600,
      color: colors.white,
      margin: 3,
    }}>
      <span style={{ fontSize: 10 }}>⚽</span> {name}
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
        {weather.temp}°F{feelsDiff ? ` · feels ${weather.apparent}°F` : ''}
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
