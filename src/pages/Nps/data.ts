/**
 * Sample NPS answers from chat, shared by Conversations, Customers and Analytics (Product Spec: NPS style chat CSAT).
 * One rule everywhere (spec §9 Consistency): account NPS uses each contact's latest answer in the period, once.
 */
export type NpsGroup = 'promoter' | 'passive' | 'detractor'
export const npsGroup = (score: number): NpsGroup => (score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor')
export const GROUP_LABEL: Record<NpsGroup, string> = { promoter: 'Promoter', passive: 'Passive', detractor: 'Detractor' }
export const GROUP_COLOR = { promoter: 'green', passive: 'yellow', detractor: 'red' } as const

/** The prototype's "today". */
export const TODAY = new Date('2026-11-16T12:00:00')
const DAY = 86_400_000

export type Account = { id: string; name: string; domain: string; owner: string }
export type Contact = { id: string; name: string; email: string; accountId: string | null }
export type NpsResponse = { id: string; contactId: string; score: number; comment?: string; date: string; inbox: 'chat-support' | 'website-chat'; topic: string; reply: string }

export const ACCOUNTS: Account[] = [
  { id: 'rivermill', name: 'Rivermill Plastics', domain: 'rivermill.com', owner: 'Meera Iyer' },
  { id: 'northgate', name: 'Northgate Foods', domain: 'northgatefoods.com', owner: 'Meera Iyer' },
  { id: 'bluefin', name: 'Bluefin Packaging', domain: 'bluefinpack.com', owner: 'Dan Brooks' },
  { id: 'corvex', name: 'Corvex Metals', domain: 'corvex.io', owner: 'Dan Brooks' },
  { id: 'alder', name: 'Alder Textiles', domain: 'aldertextiles.com', owner: 'Meera Iyer' },
]

export const CONTACTS: Contact[] = [
  { id: 'priya', name: 'Priya Nair', email: 'priya@rivermill.com', accountId: 'rivermill' },
  { id: 'tom', name: 'Tom Becker', email: 'tom.becker@rivermill.com', accountId: 'rivermill' },
  { id: 'ana', name: 'Ana Lopez', email: 'ana@rivermill.com', accountId: 'rivermill' },
  { id: 'sam', name: 'Sam Ortiz', email: 'sam@northgatefoods.com', accountId: 'northgate' },
  { id: 'lena', name: 'Lena Fischer', email: 'lena@northgatefoods.com', accountId: 'northgate' },
  { id: 'raj', name: 'Raj Patel', email: 'raj@northgatefoods.com', accountId: 'northgate' },
  { id: 'mia', name: 'Mia Chen', email: 'mia@northgatefoods.com', accountId: 'northgate' },
  { id: 'owen', name: 'Owen Hart', email: 'owen@bluefinpack.com', accountId: 'bluefin' },
  { id: 'zara', name: 'Zara Ali', email: 'zara@bluefinpack.com', accountId: 'bluefin' },
  { id: 'ivan', name: 'Ivan Petrov', email: 'ivan@corvex.io', accountId: 'corvex' },
  { id: 'hannah', name: 'Hannah Moore', email: 'hannah@corvex.io', accountId: 'corvex' },
  { id: 'leo', name: 'Leo Grant', email: 'leo@corvex.io', accountId: 'corvex' },
  { id: 'kim', name: 'Kim Lee', email: 'kim@corvex.io', accountId: 'corvex' },
  { id: 'nora', name: 'Nora Walsh', email: 'nora@aldertextiles.com', accountId: 'alder' },
  { id: 'chris', name: 'Chris Doyle', email: 'chris.doyle@gmail.com', accountId: null },
  { id: 'eli', name: 'Eli Brooks', email: 'eli.b@outlook.com', accountId: null },
]

const d = (daysAgo: number) => new Date(TODAY.getTime() - daysAgo * DAY).toISOString()

export const RESPONSES: NpsResponse[] = [
  { id: 'r1', contactId: 'priya', score: 3, date: d(2), inbox: 'chat-support', comment: 'The fix was quick, but this meter has failed three times this month.', topic: 'Meter 4 is showing zero output again', reply: 'I’ve reset the sensor and readings are back. I’ll flag the repeat failures to the hardware team.' },
  { id: 'r2', contactId: 'priya', score: 7, date: d(130), inbox: 'chat-support', comment: 'Good overall, setup took a while.', topic: 'How do I add a new line to the dashboard?', reply: 'Go to Lines › Add line, then pick the machine. I’ve added Line 6 for you.' },
  { id: 'r3', contactId: 'tom', score: 6, date: d(9), inbox: 'website-chat', comment: 'Reports are slow to load for our shift leads.', topic: 'Shift report takes a minute to open', reply: 'We’ve cached the report for your plant. It should open in a few seconds now.' },
  { id: 'r4', contactId: 'ana', score: 9, date: d(20), inbox: 'chat-support', comment: 'Love the downtime alerts.', topic: 'Can alerts go to our Slack channel?', reply: 'Yes. I’ve connected #plant-alerts, you’ll see the next downtime alert there.' },
  { id: 'r5', contactId: 'sam', score: 10, date: d(4), inbox: 'chat-support', comment: 'Best support team we work with.', topic: 'Need an export of last week’s OEE', reply: 'Here’s the CSV for Nov 3–9. You can also schedule it weekly from Reports.' },
  { id: 'r6', contactId: 'lena', score: 9, date: d(15), inbox: 'website-chat', topic: 'Adding two new operators', reply: 'Both are invited. They’ll get an email to set a password.' },
  { id: 'r7', contactId: 'raj', score: 8, date: d(27), inbox: 'chat-support', comment: 'Works well, would like a mobile app.', topic: 'Is there a mobile app?', reply: 'Not yet, but the dashboard works in mobile browsers. I’ve shared your request with product.' },
  { id: 'r8', contactId: 'mia', score: 9, date: d(41), inbox: 'chat-support', topic: 'Changing the plant timezone', reply: 'Done, the plant now uses Central Time and reports have been rebuilt.' },
  { id: 'r9', contactId: 'sam', score: 9, date: d(160), inbox: 'chat-support', topic: 'Billing contact change', reply: 'Updated, invoices now go to finance@northgatefoods.com.' },
  { id: 'r10', contactId: 'owen', score: 7, date: d(12), inbox: 'website-chat', comment: 'Fine, but the sensor install guide is confusing.', topic: 'Sensor install guide question', reply: 'The clamp goes on the motor feed, not the main. I’ve sent a diagram.' },
  { id: 'r11', contactId: 'zara', score: 10, date: d(33), inbox: 'website-chat', comment: 'Paid for itself in a month.', topic: 'How is OEE calculated?', reply: 'Availability × performance × quality. Here’s the article with examples.' },
  { id: 'r12', contactId: 'ivan', score: 2, date: d(6), inbox: 'chat-support', comment: 'Data gaps every night, third ticket about it.', topic: 'Missing data between 1 and 3 AM', reply: 'The gateway reboots overnight. I’ve changed its schedule and opened an engineering ticket.' },
  { id: 'r13', contactId: 'hannah', score: 5, date: d(18), inbox: 'chat-support', comment: 'Too many false downtime alerts.', topic: 'Alerts firing during planned breaks', reply: 'I’ve added your break schedule so planned stops won’t alert.' },
  { id: 'r14', contactId: 'leo', score: 9, date: d(24), inbox: 'website-chat', topic: 'Adding a second plant', reply: 'The Dayton plant is set up. Gateways ship tomorrow.' },
  { id: 'r15', contactId: 'kim', score: 4, date: d(37), inbox: 'chat-support', comment: 'Hard to get the numbers our auditors need.', topic: 'Audit export format', reply: 'I’ve built a custom export with the fields your auditors listed.' },
  { id: 'r16', contactId: 'ivan', score: 6, date: d(70), inbox: 'chat-support', topic: 'Gateway offline', reply: 'Power-cycled remotely, it’s back online.' },
  { id: 'r17', contactId: 'chris', score: 8, date: d(10), inbox: 'website-chat', topic: 'Pricing for 3 machines', reply: 'Here’s the starter plan quote for 3 machines.' },
  { id: 'r18', contactId: 'eli', score: 10, date: d(48), inbox: 'website-chat', comment: 'Fast and friendly.', topic: 'Demo request', reply: 'Booked for Thursday at 10 AM, invite sent.' },
  { id: 'r19', contactId: 'tom', score: 8, date: d(62), inbox: 'website-chat', topic: 'Reset my password', reply: 'Reset link sent, it’s valid for an hour.' },
  { id: 'r20', contactId: 'lena', score: 10, date: d(55), inbox: 'website-chat', comment: 'Great onboarding.', topic: 'Training for new shift leads', reply: 'Booked a 30-minute session for Monday.' },
  { id: 'r21', contactId: 'hannah', score: 7, date: d(80), inbox: 'chat-support', topic: 'Change alert threshold', reply: 'Threshold set to 5 minutes for Line 2.' },
  { id: 'r22', contactId: 'zara', score: 9, date: d(76), inbox: 'website-chat', topic: 'Invoice copy', reply: 'Sent the October invoice to your email.' },
]

export const contactById = (id: string) => CONTACTS.find((c) => c.id === id)
export const accountById = (id: string | null | undefined) => (id ? ACCOUNTS.find((a) => a.id === id) : undefined)
export const conversationIdFor = (r: NpsResponse) => `nps-${r.id}`
export const responseByConversation = (conversationId: string) => RESPONSES.find((r) => conversationIdFor(r) === conversationId)

/* ---------- Periods ---------- */

export type Period = { from: Date; to: Date }
export const lastDays = (days: number, end = TODAY): Period => ({ from: new Date(end.getTime() - days * DAY), to: end })
export const previousPeriod = (p: Period): Period => ({ from: new Date(p.from.getTime() - (p.to.getTime() - p.from.getTime())), to: p.from })
/** Customers measures account NPS over the last 12 months (spec §6). */
export const CUSTOMERS_PERIOD = lastDays(365)

const inPeriod = (r: NpsResponse, p: Period) => { const t = new Date(r.date).getTime(); return t > p.from.getTime() && t <= p.to.getTime() }

export const responsesIn = (p: Period, inbox: string = 'all') =>
  RESPONSES.filter((r) => inPeriod(r, p) && (inbox === 'all' || r.inbox === inbox)).sort((a, b) => b.date.localeCompare(a.date))

/** NPS of a list of scores: share of promoters minus share of detractors, rounded. Null with no scores. */
export function npsOf(scores: number[]) {
  if (scores.length === 0) return null
  const p = scores.filter((s) => s >= 9).length
  const det = scores.filter((s) => s <= 6).length
  return Math.round(((p - det) / scores.length) * 100)
}

export type Split = { promoter: number; passive: number; detractor: number; total: number }
export const splitOf = (scores: number[]): Split => ({
  promoter: scores.filter((s) => s >= 9).length,
  passive: scores.filter((s) => s >= 7 && s <= 8).length,
  detractor: scores.filter((s) => s <= 6).length,
  total: scores.length,
})

/** Each contact's latest answer in the period, newest first. */
export function latestByContact(p: Period, inbox = 'all') {
  const seen = new Map<string, NpsResponse>()
  for (const r of responsesIn(p, inbox)) if (!seen.has(r.contactId)) seen.set(r.contactId, r)
  return [...seen.values()]
}

/** Account NPS: each contact counts once, with their latest answer in the period. Contacts at the account now. */
export function accountNps(accountId: string | null, p: Period, inbox = 'all') {
  const latest = latestByContact(p, inbox).filter((r) => (contactById(r.contactId)?.accountId ?? null) === accountId)
  const scores = latest.map((r) => r.score)
  return { nps: npsOf(scores), split: splitOf(scores), latest: [...latest].sort((a, b) => a.score - b.score) }
}

export const latestForContact = (contactId: string, p: Period = CUSTOMERS_PERIOD) => latestByContact(p).find((r) => r.contactId === contactId)
export const historyForContact = (contactId: string) => RESPONSES.filter((r) => r.contactId === contactId).sort((a, b) => b.date.localeCompare(a.date))

/** Fewer answering contacts than this shows the "based on few answers" note (spec §7). */
export const FEW_ANSWERS = 3

/* ---------- Formatting ---------- */

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: new Date(iso).getFullYear() === TODAY.getFullYear() ? undefined : 'numeric' })
/** Uses a real minus sign for negative scores. */
export const fmtNps = (n: number | null) => (n === null ? '-' : n < 0 ? `−${Math.abs(n)}` : String(n))
export const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
