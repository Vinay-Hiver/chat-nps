import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { Input } from '../../components/Input'
import { Popover } from '../../components/Popover'
import { Switch } from '../../components/Switch'
import { Table } from '../../components/Table'
import type { TableColumn } from '../../components/Table'
import { Tabs } from '../../components/Tabs'
import { Tag } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { EmptyState } from '../../patterns/EmptyState'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import { ACCOUNTS, FEW_ANSWERS, TODAY, lastDays, accountById, accountNps, contactById, conversationIdFor, fmtDate, fmtNps, latestByContact, npsGroup, npsOf, pct, previousPeriod, responsesIn, splitOf } from '../Nps/data'
import type { NpsResponse, Period } from '../Nps/data'
import type { Navigate } from '../Nps/nav'
import { NpsValue, ScoreTag } from '../Nps/shared'
import { ConversationModal } from '../Customers/ConversationModal'
import './AnalyticsPage.css'

const RANGES = [
  { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: 'quarter', label: 'This quarter' }, { value: '365', label: 'Last 12 months' },
]
const INBOXES = [{ value: 'all', label: 'All chat inboxes' }, { value: 'chat-support', label: 'Chat-Support' }, { value: 'website-chat', label: 'Website chat' }]
const periodFor = (range: string): Period =>
  range === 'quarter' ? { from: new Date(TODAY.getFullYear(), Math.floor(TODAY.getMonth() / 3) * 3, 1), to: TODAY } : lastDays(Number(range))


const PAGE_SIZE = 5
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * Analytics › Reports › NPS laid out like the product's CSAT report: a left panel (breadcrumb, Reports/Dashboards,
 * inbox, search, Insights, the reports list with NPS after CSAT), then the summary cards, the weekly trend and the
 * Accounts and Contacts tables. No per-user table: NPS isn't credited to agents.
 */
export function AnalyticsPage({ onNavigate }: { onNavigate?: Navigate }) {
  const [report, setReport] = useState('nps')
  const [inbox, setInbox] = useState('all')
  return (
    <PageLayout
      variant="home" className="ap-layout"
      nav={<MainNav items={navSampleItems} footerItems={navSampleFooterItems} value="analytics" onChange={(id) => onNavigate?.(id)} user={{ initial: 'J', name: 'John Cole' }} />}
      sidebar={<ReportsPanel report={report} onReport={setReport} inbox={inbox} onInbox={setInbox} />}
    >
      {report === 'nps'
        ? <NpsReport inbox={inbox} onOpenConversation={(conversationId) => onNavigate?.('conversations', { conversationId })} onOpenAccount={(accountId) => onNavigate?.('customers', { accountId })} />
        : <div className="ap-main"><div className="ap-head"><h1 className="ap-title">{report === 'csat' ? 'CSAT' : report === 'chats' ? 'Chats' : 'Insights'}</h1></div><EmptyState icon="search" title="Not part of this prototype" description="Open the NPS report to see chat NPS." /></div>}
    </PageLayout>
  )
}

function ReportsPanel({ report, onReport, inbox, onInbox }: { report: string; onReport: (v: string) => void; inbox: string; onInbox: (v: string) => void }) {
  const [tab, setTab] = useState('reports')
  const item = (id: string, label: ReactNode, extra?: ReactNode) => (
    <button type="button" className={`ap-side__item${report === id ? ' ap-side__item--on' : ''}`} aria-current={report === id ? 'page' : undefined} onClick={() => onReport(id)}>{label}{extra}</button>
  )
  return (
    <aside className="ap-side" aria-label="Analytics">
      <nav className="ap-crumbs" aria-label="Breadcrumb"><span>Home</span><Icon name="chevronright" size={14} /><span className="ap-crumbs__here"><Icon name="analytics" size={14} />Analytics</span></nav>
      <div className="ap-side__tabs"><Tabs tabs={[{ value: 'reports', label: 'Reports' }, { value: 'dashboards', label: 'Dashboards' }]} value={tab} onChange={setTab} aria-label="Analytics view" /></div>
      <div className="ap-side__filters">
        <Select icon="chatinbox" value={inbox} options={INBOXES} onChange={onInbox} label="Inbox" full />
        <Input search size="sm" fullWidth placeholder="Search" aria-label="Search reports" />
      </div>
      <div className="ap-side__group">{item('insights', <span className="ap-side__label"><Icon name="magic" size={16} />Insights</span>, <Tag color="yellow">New</Tag>)}</div>
      <div className="ap-side__group">
        <span className="ap-side__heading"><Icon name="analytics" size={16} />Reports</span>
        {item('chats', 'Chats')}
        {item('csat', 'CSAT')}
        {item('nps', 'NPS')}
      </div>
    </aside>
  )
}

/** A button that opens a radio list under it. */
function Select({ icon, value, options, onChange, label, full, text }: { icon: IconName; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; label: string; full?: boolean; text?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <span ref={ref} className={full ? 'ap-select ap-select--full' : 'ap-select'}>
        <Button variant={full ? 'secondary' : 'ghost'} size="sm" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? ''}`}
          iconLeft={<Icon name={icon} size={16} />} iconRight={<Icon name={open ? 'chevrontop' : 'chevrondown'} size={16} />} onClick={() => setOpen((o) => !o)}
        >{text ?? current?.label}</Button>
      </span>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} matchAnchorWidth={full} placement={full ? 'bottom-start' : 'bottom-end'}>
        <Dropdown variant="radio" value={value} options={options} onChange={(v) => { onChange(Array.isArray(v) ? v[0] : v); setOpen(false) }} />
      </Popover>
    </>
  )
}

type Tone = 'all' | 'promoter' | 'passive' | 'detractor'
type Group = Exclude<Tone, 'all'>
const GROUPS: { value: Group; label: string }[] = [{ value: 'promoter', label: 'Promoters' }, { value: 'passive', label: 'Passives' }, { value: 'detractor', label: 'Detractors' }]

const GROUP_MENU_WIDTH = 160

/** Filters the Contacts table by group: a checkbox list; the button reads "All" when every group is ticked. */
function GroupFilter({ value, onChange }: { value: Group[]; onChange: (v: Group[]) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  // Where the button was when the menu opened. The button's text (and width) changes as boxes are ticked, so the menu
  // anchors to this frozen spot instead and stays put while it's open.
  const [at, setAt] = useState<DOMRect | null>(null)
  const text = value.length === GROUPS.length ? 'All' : value.length === 0 ? 'None' : GROUPS.filter((g) => value.includes(g.value)).map((g) => g.label).join(', ')
  // Clicking the button while open counts as an outside click for the popover (it anchors to the frozen spot), so a
  // close that just happened shouldn't be undone by the same click reopening it.
  const closedAt = useRef(0)
  const close = () => { closedAt.current = Date.now(); setAt(null) }
  const toggle = () => { if (Date.now() - closedAt.current < 300) return; setAt((cur) => (cur ? null : ref.current?.getBoundingClientRect() ?? null)) }
  return (
    <span className="ap-groupfilter">
      <span className="ap-groupfilter__label" id="ap-groupfilter-label">Show:</span>
      <span ref={ref} className="ap-select">
        <Button variant="secondary" size="sm" aria-haspopup="listbox" aria-expanded={!!at} aria-labelledby="ap-groupfilter-label ap-groupfilter-value"
          iconRight={<Icon name={at ? 'chevrontop' : 'chevrondown'} size={16} />} onClick={toggle}
        ><span id="ap-groupfilter-value">{text}</span></Button>
      </span>
      {at && <span ref={anchorRef} aria-hidden="true" style={{ position: 'fixed', left: at.left, top: at.top, width: at.width, height: at.height, pointerEvents: 'none' }} />}
      <Popover open={!!at} onClose={close} anchorRef={anchorRef} placement="bottom-start">
        {/* Centred under the button: shift by half the width difference. */}
        <div className="ap-groupmenu" style={{ marginLeft: at ? (at.width - GROUP_MENU_WIDTH) / 2 : 0 }}>
          <Dropdown variant="checkbox" value={value} options={GROUPS} onChange={(v) => onChange((Array.isArray(v) ? v : [v]) as Group[])} />
        </div>
      </Popover>
    </span>
  )
}

function SummaryCard({ tone, face, title, value, delta, link, onOpen }: { tone: Tone; face: string; title: string; value: string; delta: number | null; link: string; onOpen: () => void }) {
  return (
    <button type="button" className={`ap-card ap-card--${tone}`} onClick={onOpen} aria-label={`${title}: ${value}. Open ${link}`}>
      <span className="ap-card__face" aria-hidden="true">{face}</span>
      <span className="ap-card__body">
        <span className="ap-card__title">{title}</span>
        <span className="ap-card__value">{value}<Delta value={delta} /></span>
        <span className="ap-card__link">{link}</span>
      </span>
    </button>
  )
}

function Delta({ value }: { value: number | null }) {
  return <span className={`ap-card__delta${value === null ? '' : value >= 0 ? ' ap-card__delta--up' : ' ap-card__delta--down'}`}>{value === null ? '-' : `${value >= 0 ? '+' : '−'}${Math.abs(value)}`}</span>
}

const TONE_FACE: Record<Tone, string> = { all: '😀😐🙁', promoter: '😀', passive: '😐', detractor: '🙁' }
const GROUP_LABEL = { promoter: 'Promoter', passive: 'Passive', detractor: 'Detractor' } as const
const FEEDBACK_PAGE = 10

/**
 * The page a summary card opens, like the product's "CSAT feedback summary": a back arrow and title with the date
 * range, the four cards as tabs with the clicked one selected, then every answer in that group, newest first.
 */
function NpsFeedback({ tone, onTone, onBack, tabs, responses, rangeControl, onOpenConversation }: {
  tone: Tone
  onTone: (t: Tone) => void
  onBack: () => void
  tabs: { tone: Tone; title: string; value: string; delta: number | null }[]
  responses: NpsResponse[]
  rangeControl: ReactNode
  onOpenConversation: (id: string) => void
}) {
  const [commentsOnly, setCommentsOnly] = useState(false)
  const [page, setPage] = useState(0)
  const rows = responses
    .filter((r) => tone === 'all' || npsGroup(r.score) === tone)
    .filter((r) => !commentsOnly || r.comment)
    .sort((a, b) => b.date.localeCompare(a.date))
  const shown = rows.slice(page * FEEDBACK_PAGE, (page + 1) * FEEDBACK_PAGE)
  const from = rows.length ? page * FEEDBACK_PAGE + 1 : 0
  const to = Math.min(rows.length, (page + 1) * FEEDBACK_PAGE)
  const label = tone === 'all' ? 'total responses' : `${GROUP_LABEL[tone].toLowerCase()} responses`
  return (
    <div className="ap-main ap-fb">
      <div className="ap-head">
        <span className="ap-fb__titlewrap">
          <Button iconOnly variant="ghost" size="xs" aria-label="Back to the NPS report" onClick={onBack}><Icon name="chevronleft" size={16} /></Button>
          <h1 className="ap-title">NPS feedback summary</h1>
        </span>
        <div className="ap-head__tools">{rangeControl}</div>
      </div>

      <div className="ap-fb__tabs" role="tablist" aria-label="Responses">
        {tabs.map((t) => (
          <button key={t.tone} type="button" role="tab" aria-selected={t.tone === tone} className={`ap-fb__tab${t.tone === tone ? ' ap-fb__tab--on' : ''}`} onClick={() => { onTone(t.tone); setPage(0) }}>
            <span className={`ap-fb__face${t.tone === 'all' ? ' ap-fb__face--all' : ''}`} aria-hidden="true">{TONE_FACE[t.tone]}</span>
            <span className="ap-fb__tabtext">
              <span className="ap-fb__tabtitle">{t.title}</span>
              <span className="ap-fb__tabvalue">{t.value}<Delta value={t.delta} /></span>
            </span>
          </button>
        ))}
      </div>

      <section className="ap-section" aria-labelledby="ap-fb-count">
        <div className="ap-section__bar">
          <h2 id="ap-fb-count" className="ap-section__title">{rows.length} {label} received</h2>
          <div className="ap-section__right">
            <Switch checked={commentsOnly} onChange={(e) => { setCommentsOnly(e.target.checked); setPage(0) }} label="Comments only" />
            <span className="ap-pager">
              <span>{from}–{to} of {rows.length}</span>
              <Button iconOnly variant="ghost" size="xs" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="chevronleft" size={16} /></Button>
              <Button iconOnly variant="ghost" size="xs" aria-label="Next page" disabled={to >= rows.length} onClick={() => setPage(page + 1)}><Icon name="chevronright" size={16} /></Button>
            </span>
          </div>
        </div>
        {shown.length === 0 ? <p className="ap-foot">No responses here in this range.</p> : (
          <ul className="ap-fb__list">
            {shown.map((r) => {
              const g = npsGroup(r.score)
              const contact = contactById(r.contactId)
              return (
                <li key={r.id} className="ap-fb__row">
                  <div className="ap-fb__main">
                    <span className="ap-fb__top">
                      <span className="ap-fb__chip"><span aria-hidden="true">{TONE_FACE[g]}</span>{r.score} · {GROUP_LABEL[g]}</span>
                      <button type="button" className="ap-fb__subject" title="Open the conversation" onClick={() => onOpenConversation(conversationIdFor(r))}>
                        <span className="ap-fb__subjecttext">{r.topic}</span>
                        <Icon name="newtab" size={14} className="ap-fb__newtab" />
                      </button>
                    </span>
                    {r.comment ? <p className="ap-fb__comment">{r.comment}</p> : <p className="ap-fb__comment ap-fb__comment--none">- no comments -</p>}
                  </div>
                  <span className="ap-fb__meta"><span className="ap-fb__metalabel">Received at</span>{fmtDate(r.date)}</span>
                  <span className="ap-fb__meta"><span className="ap-fb__metalabel">Contact</span>{contact?.name ?? 'N/A'}</span>
                  <span className="ap-fb__meta"><span className="ap-fb__metalabel">Account</span>{accountById(contact?.accountId)?.name ?? 'No account'}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/** The pager on the right of a table's header: "1–5 of 7" and previous/next. */
function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * PAGE_SIZE)
  return (
    <span className="ap-pager">
      <span>{from}–{to} of {total}</span>
      <Button iconOnly variant="ghost" size="xs" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}><Icon name="chevronleft" size={16} /></Button>
      <Button iconOnly variant="ghost" size="xs" aria-label="Next page" disabled={to >= total} onClick={() => onPage(page + 1)}><Icon name="chevronright" size={16} /></Button>
    </span>
  )
}

/** A column header that sorts the table; the sorted one is blue with an arrow, like the product. */
function SortHead({ label, on, dir, onClick }: { label: string; on: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <button type="button" className={`ap-sort${on ? ' ap-sort--on' : ''}`} onClick={onClick} aria-label={`Sort by ${label}`}>
      {label}{on && <Icon name="arrowback" size={14} className={dir === 'asc' ? 'ap-sort__up' : 'ap-sort__down'} />}
    </button>
  )
}

type Bucket = { label: string; title: string; nps: number | null; answered: number; shown: number }
type Grouping = 'week' | 'month'
const DAY_MS = 86_400_000

/**
 * Week or month points for the range: weeks up to about a quarter (at most ~13 points), months beyond that,
 * so 12 months reads as 12 points instead of 52.
 */
function trendBuckets(p: Period, inbox: string): { grouping: Grouping; buckets: Bucket[] } {
  const grouping: Grouping = (p.to.getTime() - p.from.getTime()) / DAY_MS > 100 ? 'month' : 'week'
  const ranges: { from: Date; to: Date; label: string; title: string }[] = []
  if (grouping === 'week') {
    for (let end = p.to.getTime(); end > p.from.getTime(); end -= 7 * DAY_MS) {
      const from = new Date(Math.max(end - 7 * DAY_MS, p.from.getTime()))
      const label = from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ranges.unshift({ from, to: new Date(end), label, title: `Week of ${label}` })
    }
  } else {
    let m = new Date(p.to.getFullYear(), p.to.getMonth(), 1)
    while (m.getTime() + 31 * DAY_MS > p.from.getTime()) {
      const from = new Date(Math.max(m.getTime(), p.from.getTime()))
      const to = new Date(Math.min(new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime(), p.to.getTime()))
      if (to > from) ranges.unshift({ from, to, label: '', title: m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) })
      m = new Date(m.getFullYear(), m.getMonth() - 1, 1)
    }
    // Month names, with the year on the first month and on each January.
    ranges.forEach((r, i) => {
      const month = r.from.toLocaleDateString('en-US', { month: 'short' })
      r.label = i === 0 || r.from.getMonth() === 0 ? `${month} ’${String(r.from.getFullYear()).slice(2)}` : month
    })
  }
  const buckets = ranges.map((r, i) => {
    const rs = responsesIn({ from: r.from, to: r.to }, inbox)
    // Prototype: the question was shown in roughly twice as many chats as were answered.
    const shown = rs.length === 0 ? (i % 3) + 1 : rs.length * 2 + (i % 2)
    return { label: r.label, title: r.title, nps: npsOf(rs.map((x) => x.score)), answered: rs.length, shown }
  })
  return { grouping, buckets }
}

const TICKS = [100, 50, 0, -50, -100]
const yPos = (nps: number) => (100 - nps) / 2 // % from the top: +100 at 0%, −100 at 100%

/** One line for NPS (−100 to +100) by week or month, with each point's answered count under it. Points with no answers break the line. */
function TrendChart({ buckets, mode = 'line' }: { buckets: Bucket[]; mode?: 'line' | 'bars' | 'lines' }) {
  const showRate = mode !== 'line'
  const [hover, setHover] = useState<number | null>(null)
  const rates = buckets.map((w) => pct(w.answered, w.shown))
  const n = buckets.length
  const x = (i: number) => ((i + 0.5) / n) * 100
  const segments: string[] = []
  let run: string[] = []
  buckets.forEach((w, i) => {
    if (w.nps === null) { if (run.length > 1) segments.push(run.join(' ')); run = []; return }
    run.push(`${x(i)},${yPos(w.nps)}`)
  })
  if (run.length > 1) segments.push(run.join(' '))
  // Soft fill between each NPS segment and the zero line.
  const areas = segments.map((pts) => { const xs = pts.split(' ').map((p) => p.split(',')[0]); return `${xs[0]},50 ${pts} ${xs[xs.length - 1]},50` })
  const rateY = (r: number) => 100 - r
  const ratePts = buckets.map((_, i) => `${x(i)},${rateY(rates[i])}`).join(' ')
  return (
    <div className="ap-chart" role="img" aria-label={`NPS: ${buckets.map((w) => `${w.title} ${fmtNps(w.nps)}`).join(', ')}`}>
      {showRate && (
        <div className={`ap-chart__legend ap-chart__legend--${mode}`}>
          <span><span className="ap-chart__key ap-chart__key--nps" />NPS <span className="ap-muted">(left scale, −100 to 100)</span></span>
          <span><span className="ap-chart__key ap-chart__key--rate" />Response rate <span className="ap-muted">(right scale, 0–100%)</span></span>
        </div>
      )}
      <div className="ap-chart__grid">
        <span className={`ap-chart__axistitle${mode === 'lines' ? ' ap-chart__ticks--nps' : ''}`}>NPS</span>
        <div className={`ap-chart__ticks${mode === 'lines' ? ' ap-chart__ticks--nps' : ''}`} aria-hidden="true">{TICKS.map((t) => <span key={t} style={{ top: `${yPos(t)}%` }}>{fmtNps(t)}</span>)}</div>
        <div className="ap-chart__plot">
          {hover !== null && <span className="ap-chart__band" style={{ left: `${(hover / n) * 100}%`, width: `${100 / n}%` }} />}
          {TICKS.map((t) => <span key={t} className={`ap-chart__line${t === 0 ? ' ap-chart__line--zero' : ''}`} style={{ top: `${yPos(t)}%` }} />)}
          {mode === 'bars' && buckets.map((w, i) => {
            const rate = rates[i]
            return <span key={w.title} className={`ap-chart__rate${hover === i ? ' ap-chart__rate--on' : ''}`} style={{ left: `${x(i)}%`, height: `${rate}%` }}><span className="ap-chart__ratelabel">{rate}%</span></span>
          })}
          <svg className="ap-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {mode === 'lines' && <polyline className="ap-chart__rateline" points={ratePts} />}
            {areas.map((pts) => <polygon key={pts} className="ap-chart__area" points={pts} />)}
            {segments.map((pts) => <polyline key={pts} points={pts} />)}
          </svg>
          {mode === 'lines' && buckets.map((w, i) => (
            <span key={w.title} className={`ap-chart__ratedot${hover === i ? ' ap-chart__ratedot--on' : ''}`} style={{ left: `${x(i)}%`, top: `${rateY(rates[i])}%` }} />
          ))}
          {buckets.map((w, i) => w.nps !== null && (
            <span key={w.title} className={`ap-chart__dot${w.answered < FEW_ANSWERS ? ' ap-chart__dot--few' : ''}${hover === i ? ' ap-chart__dot--on' : ''}`} style={{ left: `${x(i)}%`, top: `${yPos(w.nps)}%` }}>
              <span className={`ap-chart__val${w.nps > 70 ? ' ap-chart__val--below' : ''}`}>{fmtNps(w.nps)}</span>
            </span>
          ))}
          
          {buckets.map((w, i) => (
            <span key={w.title} className="ap-chart__hit" style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }}
              tabIndex={0} aria-label={`${w.title}: NPS ${fmtNps(w.nps)}, response rate ${rates[i]}%, ${w.answered} of ${w.shown} answered`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          ))}
          {hover !== null && (() => {
            const w = buckets[hover]
            const side = x(hover) > 70 ? 'left' : 'right'
            return (
              <div className={`ap-tip ap-tip--${side}`} style={{ left: `${x(hover)}%`, top: `${w.nps === null ? 50 : yPos(w.nps)}%` }} role="tooltip">
                <span className="ap-tip__title">{w.title}</span>
                <span className="ap-tip__row"><span>NPS score</span><strong className={w.nps === null ? '' : w.nps < 0 ? 'nps-score--neg' : w.nps > 0 ? 'nps-score--pos' : ''}>{w.nps === null ? '–' : fmtNps(w.nps)}</strong></span>
                <span className="ap-tip__row"><span>Response rate</span><strong>{rates[hover]}%</strong></span>
                <span className="ap-tip__row"><span>Answers</span><strong>{w.answered} of {w.shown}</strong></span>
              </div>
            )
          })()}
        </div>
        {showRate && <div className={`ap-chart__ticks ap-chart__ticks--right${mode === 'lines' ? ' ap-chart__ticks--ratecolor' : ''}`} aria-hidden="true">{[100, 50, 0].map((t) => <span key={t} style={{ top: `${rateY(t)}%` }}>{t}%</span>)}</div>}
        {showRate && <span className={`ap-chart__axistitle ap-chart__axistitle--right${mode === 'lines' ? ' ap-chart__ticks--ratecolor' : ''}`}>Response rate</span>}
      </div>
      <div className={`ap-chart__weeks${showRate ? ' ap-chart__weeks--rate' : ''}`}>
        {buckets.map((w, i) => (
          <div key={w.title} className={`ap-chart__week${hover === i ? ' ap-chart__week--on' : ''}`}>
            <span>{w.label}</span>
            <span className="ap-chart__answered">{w.answered === 0 ? 'No answers' : `${w.answered} of ${w.shown}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NpsReport({ inbox, onOpenConversation, onOpenAccount }: { inbox: string; onOpenConversation: (id: string) => void; onOpenAccount: (id: string) => void }) {
  const [range, setRange] = useState('90')
  const [percent, setPercent] = useState(false)
  const [accQuery, setAccQuery] = useState('')
  const [accPage, setAccPage] = useState(0)
  const [accSort, setAccSort] = useState<{ key: 'responded' | 'nps'; dir: 'asc' | 'desc' }>({ key: 'responded', dir: 'desc' })
  const [conQuery, setConQuery] = useState('')
  const [conPage, setConPage] = useState(0)
  const [groups, setGroups] = useState<Group[]>(['promoter', 'passive', 'detractor'])
  const [detail, setDetail] = useState<Tone | null>(null)
  const [modal, setModal] = useState<string | null>(null)

  const p = periodFor(range)
  const all = responsesIn(p, inbox)
  const prev = responsesIn(previousPeriod(p), inbox)
  const split = splitOf(all.map((r) => r.score))
  const prevSplit = splitOf(prev.map((r) => r.score))
  const nps = npsOf(all.map((r) => r.score))
  const prevNps = npsOf(prev.map((r) => r.score))
  const change = (now: number | null, before: number | null) => (now !== null && before !== null && prev.length > 0 ? now - before : null)
  const share = (k: 'promoter' | 'passive' | 'detractor') => pct(split[k], split.total)
  const prevShare = (k: 'promoter' | 'passive' | 'detractor') => (prevSplit.total ? pct(prevSplit[k], prevSplit.total) : null)


  const cards: { tone: Tone; title: string; value: string; delta: number | null; link: string }[] = [
    { tone: 'all', title: 'NPS score', value: fmtNps(nps), delta: change(nps, prevNps), link: `${all.length} responses` },
    { tone: 'promoter', title: 'Promoters (9–10)', value: `${share('promoter')}%`, delta: change(share('promoter'), prevShare('promoter')), link: `${split.promoter} responses` },
    { tone: 'passive', title: 'Passives (7–8)', value: `${share('passive')}%`, delta: change(share('passive'), prevShare('passive')), link: `${split.passive} responses` },
    { tone: 'detractor', title: 'Detractors (0–6)', value: `${share('detractor')}%`, delta: change(share('detractor'), prevShare('detractor')), link: `${split.detractor} responses` },
  ]
  const rangeControl = (
    <>
      <Select icon="calander" value={range} options={RANGES} onChange={(v) => { setRange(v); setAccPage(0); setConPage(0) }} label="Date range" text={`${fmtDay(p.from)} - ${fmtDay(p.to)}`} />
      <span className="ap-hours"><Icon name="clock" size={16} />Business Hours</span>
    </>
  )

  // Accounts table
  const accountRows = [...ACCOUNTS.map((a) => ({ id: a.id, name: a.name, ...accountNps(a.id, p, inbox) })), { id: 'none', name: 'No account', ...accountNps(null, p, inbox) }]
    .filter((r) => r.split.total > 0 && r.name.toLowerCase().includes(accQuery.trim().toLowerCase()))
    .sort((a, b) => {
      const v = (r: typeof a) => (accSort.key === 'nps' ? (r.nps ?? -999) : r.split.total)
      return (accSort.dir === 'desc' ? -1 : 1) * (v(a) - v(b)) || a.name.localeCompare(b.name)
    })
  type AccRow = (typeof accountRows)[number]
  const count = (n: number, total: number) => (percent ? `${pct(n, total)}%` : String(n))
  const sortBy = (key: 'responded' | 'nps') => { setAccSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' })); setAccPage(0) }
  const accountColumns: TableColumn<AccRow>[] = [
    { key: 'name', header: 'Account', render: (r) => r.id === 'none' ? <span className="ap-muted">No account</span> : <button type="button" className="ap-link" onClick={(e) => { e.stopPropagation(); onOpenAccount(r.id) }}>{r.name}</button> },
    { key: 'nps', header: <SortHead label="NPS" on={accSort.key === 'nps'} dir={accSort.dir} onClick={() => sortBy('nps')} />, render: (r) => <NpsValue value={r.nps} /> },
    { key: 'responded', header: <SortHead label="Contacts responded" on={accSort.key === 'responded'} dir={accSort.dir} onClick={() => sortBy('responded')} />, render: (r) => r.split.total },
    { key: 'promoter', header: 'Promoters', render: (r) => count(r.split.promoter, r.split.total) },
    { key: 'passive', header: 'Passives', render: (r) => count(r.split.passive, r.split.total) },
    { key: 'detractor', header: 'Detractors', render: (r) => count(r.split.detractor, r.split.total) },
  ]

  // Contacts table
  const q = conQuery.trim().toLowerCase()
  const contactRows = latestByContact(p, inbox)
    .filter((r) => groups.includes(npsGroup(r.score)))
    .filter((r) => !q || (contactById(r.contactId)?.name ?? '').toLowerCase().includes(q) || (accountById(contactById(r.contactId)?.accountId)?.name ?? 'no account').toLowerCase().includes(q))
  const contactColumns: TableColumn<NpsResponse>[] = [
    { key: 'name', header: 'Contact', render: (r) => <button type="button" className="ap-link" onClick={(e) => { e.stopPropagation(); onOpenConversation(conversationIdFor(r)) }}>{contactById(r.contactId)?.name}</button> },
    { key: 'score', header: 'Latest score', width: 150, render: (r) => <ScoreTag score={r.score} /> },
    { key: 'comment', header: 'Comment', render: (r) => r.comment ? <span className="ap-comment" title={r.comment}>{r.comment}</span> : <span className="ap-muted">-</span> },
    { key: 'account', header: 'Account', render: (r) => accountById(contactById(r.contactId)?.accountId)?.name ?? <span className="ap-muted">No account</span> },
    { key: 'date', header: 'Date', width: 120, render: (r) => fmtDate(r.date) },
  ]

  if (detail) {
    const page = (
      <NpsFeedback
        tone={detail} onTone={setDetail} onBack={() => setDetail(null)}
        tabs={cards.map((c) => ({ ...c, title: c.tone === 'all' ? 'Total responses' : c.title, value: c.tone === 'all' ? String(all.length) : c.value, delta: c.tone === 'all' ? null : c.delta }))}
        responses={all} rangeControl={rangeControl} onOpenConversation={setModal}
      />
    )
    return (
      <>
        {page}
        {modal && <ConversationModal conversationId={modal} onOpenConversation={setModal} onOpenAccount={(id) => { setModal(null); onOpenAccount(id) }} onClose={() => setModal(null)} />}
      </>
    )
  }

  return (
    <div className="ap-main">
      <div className="ap-head">
        <h1 className="ap-title">Net Promoter Score</h1>
        <div className="ap-head__tools">{rangeControl}</div>
      </div>

      <section className="ap-section" aria-labelledby="ap-summary">
        <h2 id="ap-summary" className="ap-section__title">Summary</h2>
        <div className="ap-cards">
          {cards.map((c) => <SummaryCard key={c.tone} {...c} face={TONE_FACE[c.tone]} onOpen={() => setDetail(c.tone)} />)}
        </div>
      </section>


      <section className="ap-section" aria-labelledby="ap-accounts">
        <div className="ap-section__bar">
          <div className="ap-section__left">
            <h2 id="ap-accounts" className="ap-section__title">Accounts</h2>
            <span className="ap-search"><Input search size="sm" placeholder="Search" aria-label="Search accounts" value={accQuery} onChange={(e) => { setAccQuery(e.target.value); setAccPage(0) }} /></span>
          </div>
          <div className="ap-section__right">
            <Switch checked={percent} onChange={(e) => setPercent(e.target.checked)} label="Percentage" />
            <Pager page={accPage} total={accountRows.length} onPage={setAccPage} />
          </div>
        </div>
        <div className="ap-table"><Table aria-label="NPS by account" columns={accountColumns} rows={accountRows.slice(accPage * PAGE_SIZE, (accPage + 1) * PAGE_SIZE)} getRowId={(r) => r.id} /></div>
        {accountRows.length === 0 && <p className="ap-foot">No NPS answers in this range.</p>}
      </section>

      <section className="ap-section" aria-labelledby="ap-contacts">
        <div className="ap-section__bar">
          <div className="ap-section__left">
            <h2 id="ap-contacts" className="ap-section__title">Contacts</h2>
            <span className="ap-search"><Input search size="sm" placeholder="Search" aria-label="Search contacts" value={conQuery} onChange={(e) => { setConQuery(e.target.value); setConPage(0) }} /></span>
          </div>
          <div className="ap-section__right">
            <GroupFilter value={groups} onChange={(v) => { setGroups(v); setConPage(0) }} />
            <Pager page={conPage} total={contactRows.length} onPage={setConPage} />
          </div>
        </div>
        <div className="ap-table"><Table aria-label="NPS by contact" columns={contactColumns} rows={contactRows.slice(conPage * PAGE_SIZE, (conPage + 1) * PAGE_SIZE)} getRowId={(r) => r.id} onRowClick={(r) => onOpenConversation(conversationIdFor(r))} /></div>
        {contactRows.length === 0 && <p className="ap-foot">No contacts match.</p>}
        <p className="ap-foot">Each contact’s latest answer in the range. The summary counts every answer. NPS isn’t credited to agents, so there’s no per-user table.</p>
      </section>
    </div>
  )
}
