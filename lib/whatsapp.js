/**
 * Sends a WhatsApp message via the Meta Cloud API.
 * Called server-side only (from API routes).
 *
 * Setup:
 *  1. Go to developers.facebook.com → My Apps → Create App → Business
 *  2. Add "WhatsApp" product
 *  3. Get your Phone Number ID + temporary/permanent token
 *  4. Add a recipient number in the test sandbox (or use a verified number)
 *  5. Set env vars:  WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_GROUP_RECIPIENT
 *
 * Note: The free Cloud API sends to individual numbers, not group chats directly.
 * Best practice: send the announcement to the organizer's number, who forwards to the group.
 * OR use a WhatsApp broadcast list (saved as a contact group).
 */
import { findLocation } from './locations'

async function sendWhatsAppMessage(message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const recipient = process.env.WHATSAPP_GROUP_RECIPIENT // e.g. "15551234567"

  if (!phoneNumberId || !token || !recipient) {
    console.warn('WhatsApp env vars not set — skipping announcement')
    return { skipped: true }
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: message },
      }),
    }
  )

  const data = await res.json()
  if (!res.ok) {
    console.error('WhatsApp API error:', data)
    throw new Error(data.error?.message || 'WhatsApp send failed')
  }

  return data
}

export async function sendWhatsAppAnnouncement({ poll, teamA, teamB, gameTime }) {
  const teamANames = teamA.map((p) => p.name).join(', ')
  const teamBNames = teamB.map((p) => p.name).join(', ')
  const venue = findLocation(poll.location)

  const message = [
    `⚽ *Game is ON!* ${poll.players_count} players confirmed.`,
    ``,
    `📅 ${gameTime}`,
    `📍 ${poll.location}${venue ? ` (${venue.boot} boots)` : ''}`,
    ...(venue ? [`🗺️ ${venue.mapUrl}`] : []),
    ``,
    `🟦 *Team A:* ${teamANames}`,
    `🟥 *Team B:* ${teamBNames}`,
    ``,
    `See you on the pitch! 🏃`,
    ``,
    `🔗 Full details: ${process.env.NEXT_PUBLIC_APP_URL}/poll/${poll.id}`,
  ].join('\n')

  return sendWhatsAppMessage(message)
}

/**
 * Sent when a poll's voting cutoff passes without reaching min_players —
 * lets everyone know the game is off.
 */
export async function sendWhatsAppCancellation({ poll }) {
  const message = [
    `😕 *Game is off* — "${poll.title}" didn't get enough players.`,
    ``,
    `${poll.players.length}/${poll.min_players} minimum players joined.`,
    `📍 ${poll.location}`,
    ``,
    `Maybe next time! 🏃`,
  ].join('\n')

  return sendWhatsAppMessage(message)
}
