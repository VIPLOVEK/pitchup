import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Card, Label, Btn, Input, Pill, Toast, Spinner } from '../components/UI'
import { colors } from '../lib/tokens'

const STATUS_LABELS = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  declined: 'Declined',
}

const STATUS_COLORS = {
  open: colors.muted,
  planned: colors.accent,
  in_progress: colors.cardYellow,
  done: colors.cardGreen,
  declined: colors.danger,
}

const ANON_ID_KEY = 'pitchup_anon_id'
const PLAYER_KEY = 'pitchup_player'

// Returns the player's id if logged in, otherwise a stable random id
// stored in localStorage — used to dedupe upvotes per browser.
function getVoterId() {
  const saved = localStorage.getItem(PLAYER_KEY)
  if (saved) {
    try { return JSON.parse(saved).id } catch (_) {}
  }
  let anonId = localStorage.getItem(ANON_ID_KEY)
  if (!anonId) {
    anonId = `anon-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(ANON_ID_KEY, anonId)
  }
  return anonId
}

export default function FeedbackPage() {
  const [requests, setRequests] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [voterId, setVoterId] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    fetch('/api/feature-requests')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setRequests)
      .catch(() => setRequests([]))
  }

  useEffect(() => {
    setVoterId(getVoterId())
    const saved = localStorage.getItem(PLAYER_KEY)
    if (saved) {
      try { setAuthorName(JSON.parse(saved).name || '') } catch (_) {}
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Enter a title for your request'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, authorName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTitle('')
      setDescription('')
      showToast('Thanks! Your suggestion has been added.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (id) => {
    try {
      const res = await fetch(`/api/feature-requests/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequests(reqs => reqs.map(r => r.id === id ? data : r))
    } catch (e) {
      showToast(e.message)
    }
  }

  return (
    <Layout title="Suggestion Box — PitchUp" description="Suggest features and vote on what to build next.">
      <Card>
        <Label>Suggest a feature</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What would you like to see?" />
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="More details (optional)" />
        <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Your name (optional)" />
        {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <Btn full onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit suggestion'}
        </Btn>
      </Card>

      <Card>
        <Label>{requests ? `${requests.length} suggestion${requests.length === 1 ? '' : 's'}` : 'Suggestions'}</Label>
        {requests === null && <Spinner label="Loading suggestions..." />}
        {requests?.length === 0 && (
          <p style={{ color: colors.muted, fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
            No suggestions yet — be the first!
          </p>
        )}
        {requests?.map(r => {
          const upvoted = voterId && (r.upvotes || []).includes(voterId)
          return (
            <div
              key={r.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 0', borderBottom: `1px solid ${colors.grass}22`,
              }}
            >
              <button
                onClick={() => handleUpvote(r.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: upvoted ? colors.accent + '22' : colors.pitchMid,
                  border: `1.5px solid ${upvoted ? colors.accent : colors.grass + '33'}`,
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: upvoted ? colors.accent : colors.muted,
                  fontWeight: 700,
                  fontSize: 13,
                  minWidth: 44,
                  cursor: 'pointer',
                }}
              >
                <span>▲</span>
                <span>{r.upvotes?.length || 0}</span>
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</span>
                  <Pill color={STATUS_COLORS[r.status] || colors.muted}>{STATUS_LABELS[r.status] || r.status}</Pill>
                </div>
                {r.description && (
                  <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 0' }}>{r.description}</p>
                )}
                {r.author_name && (
                  <p style={{ color: colors.muted, fontSize: 12, margin: '4px 0 0' }}>— {r.author_name}</p>
                )}
              </div>
            </div>
          )
        })}
      </Card>
      <Toast msg={toast} />
    </Layout>
  )
}
