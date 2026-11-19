import { useState } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { Switch } from '../../components/Switch'
import { Table } from '../../components/Table'
import type { TableColumn } from '../../components/Table'
import { Tabs } from '../../components/Tabs'
import { Icon } from '../../icons/Icon'
import { ConversationsSidebar } from '../../patterns/ConversationsSidebar'
import { EmptyState } from '../../patterns/EmptyState'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import { PageBar } from '../SharedInboxes/SharedInboxesPage'
import { ACCOUNTS, TODAY, accountById, accountNps, contactById, conversationIdFor, fmtDate, fmtNps, latestByContact, lastDays, npsGroup, npsOf, pct, previousPeriod, responsesIn, splitOf } from '../Nps/data'
import type { NpsResponse, Period } from '../Nps/data'
import type { Navigate } from '../Nps/nav'
import { NpsValue, ScoreTag, SelectMenu } from '../Nps/shared'
import '../Nps/nps.css'

const RANGES = [
  { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: 'quarter', label: 'This quarter' }, { value: '365', label: 'Last 12 months' },
]
const INBOXES = [{ value: 'all', label: 'All chat inboxes' }, { value: 'chat-support', label: 'Chat-Support' }, { value: 'website-chat', label: 'Website chat' }]

const periodFor = (range: string): Period =>
  range === 'quarter' ? { from: new Date(TODAY.getFullYear(), Math.floor(TODAY.getMonth() / 3) * 3, 1), to: TODAY } : lastDays(Number(range))

const WEEK = 7 * 86_400_000

/** NPS by week, newest on the right, with the response rate (answers against chats where the question was shown). */
function weeklyTrend(p: Period, inbox: string) {
  const weeks: { label: string; nps: number | null; answered: number; shown: number }[] = []
  for (let end = p.to.getTime(), i = 0; end > p.from.getTime(); end -= WEEK, i++) {
    const wk = { from: new Date(Math.max(end - WEEK, p.from.getTime())), to: new Date(end) }
    const rs = responsesIn(wk, inbox)
    // Prototype: the question was shown in roughly twice as many chats as were answered.
    const shown = rs.length === 0 ? (i % 3) + 1 : rs.length * 2 + (i % 2)
    weeks.unshift({ label: wk.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), nps: npsOf(rs.map((r) => r.score)), answered: rs.length, shown })
  }
  return weeks
}

/** Analytics › Reports › NPS (spec §7, Support lead). Laid out like CSAT; no per-user table, because NPS isn't credited to agents. */
export function AnalyticsPage({ onNavigate }: { onNavigate?: Navigate }) {
  const [report, setReport] = useState('nps')
  return (
    <PageLayout
      variant="home"
      nav={<MainNav items={navSampleItems} footerItems={navSampleFooterItems} value="analytics" onChange={(id) => onNavigate?.(id)} user={{ initial: 'J', name: 'John Cole' }} />}
      sidebar={(
        <ConversationsSidebar
          title="Analytics" value={report} onChange={setReport}
          sections={[{
            title: 'Reports',
            items: [
              { id: 'overview', label: 'Overview', icon: 'analytics' },
              { id: 'csat', label: 'CSAT', icon: 'csat' },
              { id: 'nps', label: 'NPS', icon: 'csat' },
              { id: 'sla', label: 'SLA', icon: 'sla' },
              { id: 'response', label: 'Response time', icon: 'responsetime' },
            ],
          }]}
        />
      )}
    >
      <div className="nps-page">
        {report === 'nps' ? <NpsReport onOpenConversation={(conversationId) => onNavigate?.('conversations', { conversationId })} onOpenAccount={(accountId) => onNavigate?.('customers', { accountId })} /> : (
          <>
            <PageBar title={report === 'csat' ? 'CSAT' : report === 'sla' ? 'SLA' : report === 'response' ? 'Response time' : 'Overview'} />
            <div className="nps-page__body"><EmptyState icon="search" title="Not part of this prototype" description="Open the NPS report to see chat NPS." /></div>
          </>
        )}
      </div>
    </PageLayout>
  )
}

function NpsReport({ onOpenConversation, onOpenAccount }: { onOpenConversation: (id: string) => void; onOpenAccount: (id: string) => void }) {
  const [range, setRange] = useState('90')
  const [inbox, setInbox] = useState('all')
  const [table, setTable] = useState('accounts')
  const [percent, setPercent] = useState(false)
  const [detractorsOnly, setDetractorsOnly] = useState(false)

  const p = periodFor(range)
  const all = responsesIn(p, inbox)
  const scores = all.map((r) => r.score)
  const split = splitOf(scores)
  const nps = npsOf(scores)
  const prevNps = npsOf(responsesIn(previousPeriod(p), inbox).map((r) => r.score))
  const delta = nps !== null && prevNps !== null ? nps - prevNps : null
  const trend = weeklyTrend(p, inbox)
  const shown = trend.reduce((n, w) => n + w.shown, 0)

  const accountRows = [...ACCOUNTS.map((a) => ({ id: a.id, name: a.name, ...accountNps(a.id, p, inbox) })), { id: 'none', name: 'No account', ...accountNps(null, p, inbox) }]
    .filter((r) => r.split.total > 0)
  type AccRow = (typeof accountRows)[number]
  const count = (n: number, total: number) => (percent ? `${pct(n, total)}%` : String(n))
  const accountColumns: TableColumn<AccRow>[] = [
    { key: 'name', header: 'Account', render: (r) => r.id === 'none' ? <span className="nps-cell__muted">No account</span> : <button type="button" className="nps-link" onClick={(e) => { e.stopPropagation(); onOpenAccount(r.id) }}>{r.name}</button> },
    { key: 'nps', header: 'NPS', align: 'right', render: (r) => <NpsValue value={r.nps} /> },
    { key: 'responded', header: 'Contacts responded', align: 'right', render: (r) => r.split.total },
    { key: 'promoter', header: 'Promoters', align: 'right', render: (r) => count(r.split.promoter, r.split.total) },
    { key: 'passive', header: 'Passives', align: 'right', render: (r) => count(r.split.passive, r.split.total) },
    { key: 'detractor', header: 'Detractors', align: 'right', render: (r) => count(r.split.detractor, r.split.total) },
  ]

  const contactRows = latestByContact(p, inbox).filter((r) => !detractorsOnly || npsGroup(r.score) === 'detractor')
  const contactColumns: TableColumn<NpsResponse>[] = [
    { key: 'name', header: 'Contact', render: (r) => <button type="button" className="nps-link" onClick={(e) => { e.stopPropagation(); onOpenConversation(conversationIdFor(r)) }}>{contactById(r.contactId)?.name}</button> },
    { key: 'score', header: 'Latest score', width: 150, render: (r) => <ScoreTag score={r.score} /> },
    { key: 'comment', header: 'Comment', render: (r) => r.comment ? <span className="nps-cell__comment" title={r.comment}>{r.comment}</span> : <span className="nps-cell__muted">-</span> },
    { key: 'account', header: 'Account', render: (r) => accountById(contactById(r.contactId)?.accountId)?.name ?? <span className="nps-cell__muted">No account</span> },
    { key: 'date', header: 'Date', width: 110, render: (r) => fmtDate(r.date) },
  ]

  const cards = [
    { label: 'NPS score', icon: 'csat' as const, value: fmtNps(nps), sub: <>{delta !== null && <span className={delta >= 0 ? 'nps-delta--up' : 'nps-delta--down'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs previous period · </span>}{all.length} responses</> },
    { label: 'Promoters (9–10)', value: `${pct(split.promoter, split.total)}%`, sub: `${split.promoter} responses` },
    { label: 'Passives (7–8)', value: `${pct(split.passive, split.total)}%`, sub: `${split.passive} responses` },
    { label: 'Detractors (0–6)', value: `${pct(split.detractor, split.total)}%`, sub: `${split.detractor} responses` },
  ]

  return (
    <>
      <PageBar title="NPS" />
      <div className="nps-page__body">
        <div className="nps-toolbar">
          <SelectMenu label="Inbox" icon="chatinbox" value={inbox} options={INBOXES} onChange={setInbox} />
          <SelectMenu label="Date" icon="calander" value={range} options={RANGES} onChange={setRange} />
          <span className="nps-toolbar__spacer" />
          <span className="nps-hint">From the NPS question at the end of chats.</span>
        </div>

        <div className="nps-cards">
          {cards.map((c) => (
            <div key={c.label} className="nps-card">
              <span className="nps-card__label">{c.icon && <Icon name={c.icon} size={14} />}{c.label}</span>
              <span className="nps-card__value">{c.value}</span>
              <span className="nps-card__sub">{c.sub}</span>
            </div>
          ))}
        </div>

        <div className="nps-trend">
          <div className="nps-trend__head">
            <h2 className="nps-section-title">NPS by week</h2>
            <span className="nps-hint">Response rate {pct(all.length, shown)}%: {all.length} answers in {shown} chats where the question was shown</span>
          </div>
          <div className="nps-trend__chart" style={{ overflowX: 'auto' }}>
            {trend.map((w) => (
              <div key={w.label} className="nps-trend__col" title={`Week of ${w.label}: NPS ${fmtNps(w.nps)}, ${w.answered} of ${w.shown} answered`}>
                <span className={w.nps === null ? 'nps-trend__empty' : 'nps-trend__value'}>{fmtNps(w.nps)}</span>
                <div className="nps-trend__plot">
                  <span className="nps-trend__zero" />
                  {w.nps !== null && w.nps !== 0 && <span className={`nps-trend__bar nps-trend__bar--${w.nps > 0 ? 'pos' : 'neg'}`} style={{ height: `${Math.abs(w.nps) / 2}%` }} />}
                </div>
                <span className="nps-trend__week">{w.label}</span>
                <span className="nps-trend__rate">{pct(w.answered, w.shown)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="nps-toolbar">
          <Tabs tabs={[{ value: 'accounts', label: 'Accounts' }, { value: 'contacts', label: 'Contacts' }]} value={table} onChange={setTable} aria-label="NPS table" />
          <span className="nps-toolbar__spacer" />
          {table === 'accounts'
            ? <Switch checked={percent} onChange={(e) => setPercent(e.target.checked)} label="Show as %" />
            : <Checkbox label="Detractors only" checked={detractorsOnly} onChange={(e) => setDetractorsOnly(e.target.checked)} />}
        </div>
        {table === 'accounts'
          ? <Table aria-label="NPS by account" columns={accountColumns} rows={accountRows} getRowId={(r) => r.id} />
          : <Table aria-label="NPS by contact" columns={contactColumns} rows={contactRows} getRowId={(r) => r.id} onRowClick={(r) => onOpenConversation(conversationIdFor(r))} />}
        {(table === 'accounts' ? accountRows.length : contactRows.length) === 0 && <span className="nps-hint">No NPS answers in this range.</span>}

        <div className="nps-note"><Icon name="info" size={14} /><span>NPS isn’t credited to agents, so there’s no per-user table. Account and contact rows use each contact’s latest answer in the range; the summary counts every answer.</span></div>
      </div>
    </>
  )
}
