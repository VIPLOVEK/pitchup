import { colors, radius } from '../lib/tokens'
import { useState } from 'react'

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, max }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 100 ? colors.accent : pct > 60 ? colors.grassLight : colors.grass
  return (
    <div style={{ background: colors.pitchMid, borderRadius: radius.full, height: 8, overflow: 'hidden', margin: '12px 0 6px' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: color,
        borderRadius: radius.full,
        transition: 'width 0.4s ease',
        boxShadow: pct >= 100 ? `0 0 12px ${colors.accent}` : 'none',
      }} />
    </div>
  )
}

// ── Pill badge ────────────────────────────────────────────────────────────────
export function Pill({ color, children }) {
  return (
    <span style={{
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
export function Card({ children, highlight, style = {} }) {
  return (
    <div style={{
      background: colors.pitchCard,
      border: `1px solid ${highlight ? colors.accent + '44' : colors.grass + '22'}`,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 16,
      ...style,
    }}>
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
export function Input({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
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

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
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
      animation: 'fadeInUp 0.2s ease',
      whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

// ── Player chips ──────────────────────────────────────────────────────────────
export function PlayerChip({ name, onRemove, color }) {
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
