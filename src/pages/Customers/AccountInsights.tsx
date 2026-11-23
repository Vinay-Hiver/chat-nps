import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Popover } from '../../components/Popover'
import { Tooltip } from '../../components/Tooltip'
import { Icon } from '../../icons/Icon'
import { CUSTOMERS_PERIOD, INBOX_LABEL, accountNps, contactById, conversationIdFor, fmtDate, fmtNps, npsGroup } from '../Nps/data'
import type { Account, NpsResponse } from '../Nps/data'

type Mood = 'negative' | 'neutral' | 'positive'
type HealthLine = { title: string; icon: string; before: string; link: string; after: string; onClick: () => void }

/** How many conversations each health signal links to in the prototype; one of them is one the viewer can't open. */
const SIGNAL_COUNT = 4

/** The account Overview, from Figma (Chat NPS CSAT, node 33:11326): Account health and Account sentiment side by side. */
export function AccountInsights({ account, conversations, onOpenConversation }: {
  account: Account
  conversations: NpsResponse[]
  onOpenConversation: (id: string) => void
  onOpenContact: (id: string) => void
  onSeeConversations: () => void
  onSeeContacts: () => void
}) {
  const { nps, split } = accountNps(account.id, CUSTOMERS_PERIOD)
  const mood: Mood | null = nps === null ? null : nps < 0 ? 'negative' : nps >= 30 ? 'positive' : 'neutral'
  const [signal, setSignal] = useState<{ title: string; text: string; img: string } | null>(null)
  const link = plural(SIGNAL_COUNT, 'conversation')
  const sig = (title: string, img: string, before: string, after: string, icon = '/customers/health-item.svg'): HealthLine =>
    ({ title, icon, before, link, after, onClick: () => setSignal({ title, img, text: `${before}${link}${after}` }) })
  const lines: HealthLine[] = account.atRisk
    ? [
        sig('SLA Performance', '/customers/health-item.svg', 'Poor SLA response times across ', '. Too many replies land past the deadline.'),
        sig('Conversation volume', '/customers/info-volume.svg', 'Unusual conversation volume across ', '. The volume pattern looks irregular.'),
      ]
    : [
        sig('SLA Performance', '/customers/health-item.svg', 'Replies landed on time across ', '.'),
        sig('Conversation volume', '/customers/info-volume.svg', 'Steady conversation volume across ', '.'),
      ]
  if (nps !== null && split.total > 0) {
    const label = mood === 'negative' ? 'Low' : mood === 'positive' ? 'High' : 'Average'
    const most = split.detractor >= split.promoter && split.detractor >= split.passive ? 'detractors'
      : split.promoter >= split.passive ? 'promoters' : 'passives'
    lines.push(sig('NPS', '/customers/info-star.svg', `${label} NPS of ${fmtNps(nps)} across `, `. Most answers came from ${most}.`, '/customers/info-star.svg'))
  }
  return (
    <div className="cust-overview cust-insights">
      <AccountHealth account={account} lines={lines} />
      <Sentiment account={account} mood={mood} />
      {signal && (
        <SignalModal
          {...signal}
          account={account}
          conversations={conversations}
          onClose={() => setSignal(null)}
          onOpenConversation={(id) => { setSignal(null); onOpenConversation(id) }}
        />
      )}
    </div>
  )
}

function plural(n: number, word: string) { return `${n} ${word}${n === 1 ? '' : 's'}` }

function Card({ id, mark, title, info, chip, children }: { id: string; mark: ReactNode; title: string; info?: ReactNode; chip?: ReactNode; children: ReactNode }) {
  return (
    <section className="cust-ins" aria-labelledby={id}>
      <div className="cust-ins__head">
        {mark}
        <h3 id={id} className="cust-ins__title">{title}</h3>
        {info}
        <span className="cust-ins__spacer" />
        {chip}
      </div>
      {children}
    </section>
  )
}

function AccountHealth({ account, lines }: { account: Account; lines: HealthLine[] }) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  return (
    <Card
      id={`health-${account.id}`}
      title="Account health"
      info={<HealthInfo />}
      mark={(
        <span className="cust-ins__mark cust-ins__mark--health" aria-hidden="true">
          <span className="cust-ins__health">
            <img src="/customers/health-a.svg" alt="" className="cust-ins__health-a" />
            <img src="/customers/health-b.svg" alt="" className="cust-ins__health-b" />
          </span>
        </span>
      )}
      chip={account.atRisk
        ? <span className="cust-chip cust-chip--risk"><Icon name="alerttriangle" size={14} />At Risk</span>
        : <span className="cust-chip cust-chip--ok"><Icon name="tick" size={14} />Healthy</span>}
    >
      <ul className="cust-ins__list">
        {lines.map((l) => (
          <li key={l.title} className="cust-ins__item">
            <span className="cust-ins__icon"><img src={l.icon} alt="" className="cust-ins__itemicon" /></span>
            <span className="cust-ins__text">
              <span className="cust-ins__name">{l.title}</span>
              <span className="cust-ins__desc">{l.before}<button type="button" className="cust-ins__link" onClick={l.onClick}>{l.link}</button>{l.after}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="cust-ins__foot">
        <span className="cust-ins__ask">{vote ? 'Thanks for the feedback.' : 'Is this accurate?'}</span>
        <button type="button" className={`cust-ins__vote${vote === 'up' ? ' cust-ins__vote--on' : ''}`} aria-label="Yes, this is accurate" aria-pressed={vote === 'up'} onClick={() => setVote(vote === 'up' ? null : 'up')}>
          <img src="/customers/thumb-up.svg" alt="" />
        </button>
        <button type="button" className={`cust-ins__vote${vote === 'down' ? ' cust-ins__vote--on' : ''}`} aria-label="No, this isn’t accurate" aria-pressed={vote === 'down'} onClick={() => setVote(vote === 'down' ? null : 'down')}>
          <img src="/customers/thumb-down.svg" alt="" className="cust-ins__down" />
        </button>
      </div>
    </Card>
  )
}

type Factor = { title: string; desc: string; img: string }
const FACTORS: Factor[] = [
  { title: 'Account sentiment', desc: 'Overall sentiment detected from the tone of recent conversations.', img: '/customers/info-sentiment.svg' },
  { title: 'Conversation volume', desc: 'Unusual increases compared to the previous 30-day average volume.', img: '/customers/info-volume.svg' },
  { title: 'Replies to resolution', desc: 'Number of replies before resolution and how often conversations are reopened.', img: '/customers/info-replies.svg' },
  { title: 'SLA', desc: 'Breaches of first response, next response, or resolution policies.', img: '/customers/health-item.svg' },
  { title: 'NPS', desc: 'How likely contacts are to recommend you, from their latest answers.', img: '/customers/info-star.svg' },
]

/** The info button beside "Account health" and its "What affects health score" panel (Figma 33:11944), with NPS in place of CSAT. */
function HealthInfo() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={ref} type="button" className="cust-ins__info cust-ins__infobtn" aria-label="What affects health score" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="info" size={14} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} gap={8}>
        <div className="cust-hinfo" role="dialog" aria-label="What affects health score">
          <div className="cust-hinfo__top">
            <span className="cust-hinfo__title">What affects health score</span>
            <span className="cust-hinfo__sub">Insights are based on conversations with this account from the last 90 days.</span>
          </div>
          <ul className="cust-hinfo__list">
            {FACTORS.map((f) => (
              <li key={f.title} className="cust-hinfo__item">
                <span className="cust-hinfo__row">
                  <span className="cust-hinfo__icon"><img src={f.img} alt="" /></span>
                  <span className="cust-hinfo__name">{f.title}</span>
                </span>
                <span className="cust-hinfo__desc">{f.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </>
  )
}

const MOOD_LABEL: Record<Mood, string> = { negative: 'Negative', neutral: 'Neutral', positive: 'Positive' }

function Sentiment({ account, mood }: { account: Account; mood: Mood | null }) {
  return (
    <Card
      id={`sentiment-${account.id}`}
      title="Account sentiment"
      mark={<span className="cust-ins__mark cust-ins__mark--sentiment" aria-hidden="true"><img src="/customers/sentiment.svg" alt="" /></span>}
    >
      {mood ? (
        <div className="cust-sent">
          <span className={`cust-sent__value cust-sent__value--${mood}`}>{MOOD_LABEL[mood]}</span>
          <span className={`cust-sent__note cust-sent__note--${mood}`}>The sentiment over the past 90 days has been {mood}.</span>
        </div>
      ) : <p className="cust-ins__empty">Not enough conversations yet to read the sentiment.</p>}
    </Card>
  )
}

/**
 * The conversations behind a health signal (Figma 33:11446): the signal in the header, then the linked conversations.
 * The last one belongs to an inbox the viewer can't see, so it is blurred and says so on hover.
 */
function SignalModal({ title, text, img, account, conversations, onClose, onOpenConversation }: {
  title: string
  text: string
  img: string
  account: Account
  conversations: NpsResponse[]
  onClose: () => void
  onOpenConversation: (id: string) => void
}) {
  const [more, setMore] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    boxRef.current?.querySelector<HTMLButtonElement>('.cust-sig__close')?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const shown = conversations.length
    ? Array.from({ length: SIGNAL_COUNT - 1 }, (_, i) => conversations[i % conversations.length])
    : []
  const agent = account.csRep ?? account.owner
  return (
    <div className="cust-modal cust-sig" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cust-sig__box" role="dialog" aria-modal="true" aria-label={title} ref={boxRef}>
        <div className="cust-sig__head">
          <span className="cust-sig__mark"><img src={img} alt="" /></span>
          <span className="cust-sig__heading">
            <span className="cust-sig__title">{title}</span>
            <span className={`cust-sig__text${more ? ' cust-sig__text--open' : ''}`}>
              <span className="cust-sig__line">{text}</span>
              <button type="button" className="cust-sig__more" onClick={() => setMore((m) => !m)}>{more ? 'Show less' : 'Show more'}</button>
            </span>
          </span>
          <Button className="cust-sig__close" iconOnly variant="ghost" size="xs" aria-label="Close" onClick={onClose}><Icon name="close" size={16} /></Button>
        </div>
        <div className="cust-sig__body">
          <span className="cust-sig__count">{plural(SIGNAL_COUNT, 'conversation')} linked to this signal</span>
          {shown.map((r, i) => {
            const contact = contactById(r.contactId)
            const group = npsGroup(r.score)
            return (
              <button key={`${r.id}-${i}`} type="button" className="cust-sig__card" onClick={() => onOpenConversation(conversationIdFor(r))}>
                <span className="cust-sig__row">
                  <Icon name="chatinbox" size={14} />
                  <span className="cust-sig__who">{contact?.name ?? 'Visitor'}</span>
                  <span className="cust-sig__sep" />
                  <span className="cust-sig__status"><Icon name="openstatus" size={14} />Open</span>
                  <span className="cust-sig__sep" />
                  <span className={`cust-sig__score cust-sig__score--${group}`}>{r.score} · {group[0].toUpperCase() + group.slice(1)}</span>
                  <span className="cust-ins__spacer" />
                  <span className="cust-sig__date">{fmtDate(r.date)}</span>
                </span>
                <span className="cust-sig__row">
                  <span className="cust-sig__preview">{r.comment ?? r.topic}</span>
                  <span className="cust-sig__inbox"><Icon name="chatinbox" size={14} />{INBOX_LABEL[r.inbox]}</span>
                  <span className="cust-sig__sep" />
                  <span className="cust-sig__agent"><Avatar initial={agent[0]} size="small" color="red" />{agent}</span>
                </span>
              </button>
            )
          })}
          <Tooltip content="You don’t have access to this conversation" portal>
            <div className="cust-sig__card cust-sig__card--locked" tabIndex={0} aria-label="You don’t have access to this conversation">
              <span className="cust-sig__row">
                <Icon name="emailinbox" size={14} />
                <span className="cust-sig__sep" />
                <span className="cust-sig__status"><Icon name="openstatus" size={14} />Open</span>
                <span className="cust-ins__spacer" />
                <span className="cust-sig__date cust-sig__blur" aria-hidden="true">Nov 23, 6:13 PM</span>
              </span>
              <span className="cust-sig__subject cust-sig__blur" aria-hidden="true">5C6zRxZrph</span>
              <span className="cust-sig__row">
                <span className="cust-sig__preview cust-sig__blur" aria-hidden="true">whA54kGICjs09JDuoHiG5MwG5MnBBJCkJLYloiRTHc9O</span>
                <span className="cust-sig__inbox"><Icon name="emailinbox" size={14} />Ai Sm01</span>
                <span className="cust-sig__sep" />
                <span className="cust-sig__agent"><Avatar initial="M" size="small" color="yellow" />Mayank</span>
              </span>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
