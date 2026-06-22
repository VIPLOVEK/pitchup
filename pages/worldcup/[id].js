import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { Card, Label, Btn, Input, Spinner, Avatar, Toast, Pill } from '../../components/UI'
import { colors, radius } from '../../lib/tokens'
import { flag, STAGE_LABELS } from '../../lib/wcFlags'

function formatMatchDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}

function getResult(match) {
  if (match.score_home == null) return null
  if (match.score_home > match.score_away) return 'home'
  if (match.score_away > match.score_home) return 'away'
  return 'draw'
}

const REACTION_EMOJIS = ['🔥', '😱', '👏', '😂']

export default function MatchPage() {
  const router = useRouter()
  const { id } = router.query

  const [match, setMatch] = useState(null)
  const [preds, setPreds] = useState([])
  const [chat, setChat] = useState([])
  const [loading, setLoading] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [toast, setToast] = useState('')
  const [adminPw, setAdminPw] = useState(null)
  const [adminScoreHome, setAdminScoreHome] = useState('')
  const [adminScoreAway, setAdminScoreAway] = useState('')
  const [adminStatus, setAdminStatus] = useState('upcoming')
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const chatEndRef = useRef(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const saved = localStorage.getItem('pitchup_player')
    if (saved) { try { setPlayerName(JSON.parse(saved).name || '') } catch {} }
    const admin = localStorage.getItem('pitchup_admin')
    if (admin) { try { const a = JSON.parse(admin); if (a.password) setAdminPw(a.password) } catch {} }
  }, [])

  async function loadMatch() {
    if (!id) return
    const res = await fetch(`/api/worldcup/${id}`)
    if (res.ok) {
      const data = await res.json()
      setMatch(data.match)
      setPreds(data.predictions)
      setChat(data.chat)
    }
  }

  useEffect(() => {
    if (!id) return
    fetch(`/api/worldcup/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setMatch(data.match); setPreds(data.predictions); setChat(data.chat) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // Feature 1: Live auto-refresh
  useEffect(() => {
    if (!match || match.status !== 'live') return
    const interval = setInterval(loadMatch, 60000)
    return () => clearInterval(interval)
  }, [match?.status, id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  // Sync admin form when match loads
  useEffect(() => {
    if (match) {
      setAdminScoreHome(match.score_home != null ? String(match.score_home) : '')
      setAdminScoreAway(match.score_away != null ? String(match.score_away) : '')
      setAdminStatus(match.status || 'upcoming')
    }
  }, [match?.id])

  if (loading) return <Layout title="Match — World Cup 2026"><Card><Spinner label="Loading match..." /></Card></Layout>
  if (!match) return <Layout title="Not found"><Card><p style={{ color: colors.muted }}>Match not found.</p></Card></Layout>

  const locked = match.status !== 'upcoming' || new Date(match.match_date) <= new Date()
  const myPred = playerName ? preds.find(p => p.player_name.toLowerCase() === playerName.toLowerCase()) : null
  const result = getResult(match)
  const hasScore = match.score_home != null

  const total = preds.length
  const homePct  = total ? Math.round(preds.filter(p => p.prediction === 'home').length / total * 100) : 0
  const drawPct  = total ? Math.round(preds.filter(p => p.prediction === 'draw').length / total * 100) : 0
  const awayPct  = total ? Math.round(preds.filter(p => p.prediction === 'away').length / total * 100) : 0

  async function predict(prediction) {
    if (!playerName.trim()) { showToast('Enter your name first'); return }
    if (locked) { showToast('Predictions are locked'); return }
    setSubmitting(true)
    try {
      const saved = localStorage.getItem('pitchup_player')
      const playerId = saved ? JSON.parse(saved).id : null
      const res = await fetch(`/api/worldcup/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim(), playerId, prediction }),
      })
      if (res.ok) { setPreds(await res.json()); showToast('Prediction saved!') }
      else { const d = await res.json(); showToast(d.error || 'Failed') }
    } finally { setSubmitting(false) }
  }

  async function sendChat() {
    if (!chatMsg.trim() || !playerName.trim()) return
    setSendingChat(true)
    try {
      const res = await fetch(`/api/worldcup/chat?matchId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: playerName.trim(), message: chatMsg.trim() }),
      })
      if (res.ok) { const newMsg = await res.json(); setChat(c => [...c, newMsg]); setChatMsg('') }
    } finally { setSendingChat(false) }
  }

  // Feature 3: React to a chat message with optimistic update
  async function toggleReaction(chatId, emoji) {
    if (!playerName.trim()) { showToast('Enter your name first'); return }
    // Optimistic update
    setChat(prev => prev.map(msg => {
      if (msg.id !== chatId) return msg
      const reactions = { ...(msg.reactions || {}) }
      const arr = reactions[emoji] || []
      if (arr.includes(playerName)) {
        const next = arr.filter(n => n !== playerName)
        if (next.length === 0) delete reactions[emoji]
        else reactions[emoji] = next
      } else {
        reactions[emoji] = [...arr, playerName]
      }
      return { ...msg, reactions }
    }))
    // Persist
    try {
      await fetch('/api/worldcup/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, matchId: id, emoji, playerName: playerName.trim() }),
      })
    } catch {}
  }

  // Feature 2: Admin score update
  async function submitAdminUpdate() {
    if (!adminPw) return
    setAdminSubmitting(true)
    try {
      const body = { status: adminStatus }
      if (adminScoreHome !== '') body.scoreHome = Number(adminScoreHome)
      if (adminScoreAway !== '') body.scoreAway = Number(adminScoreAway)
      const res = await fetch(`/api/worldcup/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminPw}` },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setMatch(updated)
        showToast('Match updated!')
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed')
      }
    } finally { setAdminSubmitting(false) }
  }

  return (
    <Layout
      title={`${match.team_home} vs ${match.team_away} — World Cup 2026`}
      description={`Predict the result and chat with your squad`}
    >
      {/* Match header */}
      <Card highlight>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {match.group_name ? `Group ${match.group_name}` : STAGE_LABELS[match.stage]}
            {' · '}{formatMatchDate(match.match_date)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>{match.flag_home || flag(match.team_home)}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>{match.team_home}</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 64 }}>
            {hasScore ? (
              <div style={{ fontSize: 32, fontWeight: 900, color: colors.accent, letterSpacing: '-1px' }}>
                {match.score_home} – {match.score_away}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.muted }}>VS</div>
                {match.status === 'live' && <Pill color="#ef4444">🔴 Live</Pill>}
              </>
            )}
            {match.status === 'live' && hasScore && <Pill color="#ef4444">🔴 Live</Pill>}
            {match.status === 'finished' && <Pill color={colors.muted}>Final</Pill>}
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>{match.flag_away || flag(match.team_away)}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>{match.team_away}</div>
          </div>
        </div>

        {match.venue && <p style={{ textAlign: 'center', color: colors.muted, fontSize: 12, margin: 0 }}>📍 {match.venue}</p>}
      </Card>

      {/* Prediction */}
      <Card>
        <Label>Your prediction</Label>

        {!playerName.trim() && !locked && (
          <Input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Your name to predict"
            style={{ marginBottom: 12 }}
          />
        )}

        {myPred && (
          <div style={{
            textAlign: 'center', padding: '8px 0', marginBottom: 12,
            fontSize: 13, fontWeight: 700,
            color: myPred.is_correct === true ? colors.grassLight : myPred.is_correct === false ? colors.danger : colors.accent,
          }}>
            {myPred.is_correct === true ? '✅ You got it right!' : myPred.is_correct === false ? '❌ Better luck next match' : '📌 Your pick:'}
            {' '}
            {myPred.prediction === 'home' ? match.team_home : myPred.prediction === 'away' ? match.team_away : 'Draw'}
          </div>
        )}

        {!locked && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'home', label: match.team_home, flag: match.flag_home || flag(match.team_home) },
              { key: 'draw', label: 'Draw', flag: '🤝' },
              { key: 'away', label: match.team_away, flag: match.flag_away || flag(match.team_away) },
            ].map(opt => {
              const picked = myPred?.prediction === opt.key
              return (
                <button key={opt.key} onClick={() => predict(opt.key)} disabled={submitting}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: picked ? `${colors.accent}22` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${picked ? colors.accent : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 12, padding: '10px 6px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 20 }}>{opt.flag}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: picked ? colors.accent : colors.muted, textAlign: 'center', lineHeight: 1.2 }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {locked && !myPred && (
          <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
            Predictions are locked for this match.
          </p>
        )}

        {/* Distribution bars */}
        {total > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>{total} prediction{total !== 1 ? 's' : ''}</div>
            {[
              { key: 'home', label: match.team_home, pct: homePct, color: colors.accent },
              { key: 'draw', label: 'Draw',          pct: drawPct, color: colors.muted },
              { key: 'away', label: match.team_away, pct: awayPct, color: colors.grassLight },
            ].map(row => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: row.color, fontWeight: 600, width: 80, flexShrink: 0 }}>{row.label}</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 11, color: colors.muted, width: 30, textAlign: 'right', flexShrink: 0 }}>{row.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chat */}
      <Card>
        <Label>Match chat 💬</Label>
        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {chat.length === 0 && (
            <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No messages yet — start the chat!</p>
          )}
          {chat.map(msg => {
            const reactions = msg.reactions || {}
            return (
              <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar name={msg.author} size={26} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>{msg.author}</span>
                  <span style={{ fontSize: 11, color: colors.muted, marginLeft: 6 }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <p style={{ fontSize: 13, color: colors.white, margin: '2px 0 4px', lineHeight: 1.4 }}>{msg.message}</p>
                  {/* Reaction pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {REACTION_EMOJIS.map(emoji => {
                      const reactors = reactions[emoji] || []
                      const reacted = playerName ? reactors.includes(playerName) : false
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            background: reacted ? `${colors.accent}22` : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${reacted ? colors.accent : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 12, padding: '2px 7px',
                            cursor: 'pointer', fontSize: 13, color: reacted ? colors.accent : colors.muted,
                            fontWeight: 600, transition: 'all 0.12s',
                          }}
                        >
                          <span>{emoji}</span>
                          {reactors.length > 0 && (
                            <span style={{ fontSize: 11 }}>{reactors.length}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>
        {!playerName.trim() && (
          <Input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your name to chat" />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
            placeholder="Say something..."
            style={{
              flex: 1, background: 'rgba(6,13,24,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: radius.md, color: colors.white, padding: '10px 12px', fontSize: 14, outline: 'none',
            }}
          />
          <Btn onClick={sendChat} disabled={sendingChat || !chatMsg.trim() || !playerName.trim()}>Send</Btn>
        </div>
      </Card>

      {/* Feature 2: Admin Panel */}
      {adminPw && (
        <Card>
          <Label>🔧 Admin — Update Match</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>{match.team_home} score</div>
              <input
                type="number"
                min="0"
                value={adminScoreHome}
                onChange={e => setAdminScoreHome(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(6,13,24,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: radius.md, color: colors.white, padding: '10px 12px', fontSize: 16,
                  outline: 'none', textAlign: 'center', fontWeight: 700,
                }}
              />
            </div>
            <div style={{ fontSize: 16, color: colors.muted, paddingTop: 20 }}>–</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>{match.team_away} score</div>
              <input
                type="number"
                min="0"
                value={adminScoreAway}
                onChange={e => setAdminScoreAway(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(6,13,24,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: radius.md, color: colors.white, padding: '10px 12px', fontSize: 16,
                  outline: 'none', textAlign: 'center', fontWeight: 700,
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>Status</div>
            <select
              value={adminStatus}
              onChange={e => setAdminStatus(e.target.value)}
              style={{
                width: '100%', background: 'rgba(6,13,24,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: radius.md, color: colors.white, padding: '10px 12px', fontSize: 14, outline: 'none',
              }}
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="finished">Finished</option>
            </select>
          </div>
          <Btn onClick={submitAdminUpdate} disabled={adminSubmitting} style={{ width: '100%' }}>
            {adminSubmitting ? 'Saving...' : 'Save Changes'}
          </Btn>
        </Card>
      )}

      <Toast msg={toast} />
    </Layout>
  )
}
