import type { ChatConversation } from '../Conversations/data'
import { RESPONSES, contactById, conversationIdFor } from './data'

const COLORS = ['violet', 'green', 'orange', 'lightBlue', 'purple', 'red', 'yellow'] as const
const at = (iso: string, minutes: number) => new Date(new Date(iso).getTime() - minutes * 60_000)
  .toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** One closed chat per sample NPS answer: the question, the agent's fix, the close, then the answer. */
export function npsConversations(): ChatConversation[] {
  return [...RESPONSES].sort((a, b) => b.date.localeCompare(a.date)).map((r, i) => {
    const contact = contactById(r.contactId)!
    return {
      id: conversationIdFor(r), view: 'mine', title: contact.name, avatarColor: COLORS[i % COLORS.length], closed: true, contactId: contact.id,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      preview: r.topic,
      messages: [
        { kind: 'incoming', text: r.topic, time: at(r.date, 14) },
        { kind: 'event', text: 'John Cole joined the conversation', time: at(r.date, 13) },
        { kind: 'agent-text', text: r.reply, time: at(r.date, 6), sender: 'John Cole' },
        { kind: 'incoming', text: 'Thanks, that works.', time: at(r.date, 4) },
        { kind: 'event', text: 'Conversation closed by John Cole', time: at(r.date, 3) },
        { kind: 'nps', score: r.score, comment: r.comment, time: at(r.date, 1) },
      ],
    }
  })
}
