import { useState } from 'react'
import { Button } from '../../components/Button'
import { Table } from '../../components/Table'
import type { TableColumn } from '../../components/Table'
import { Icon } from '../../icons/Icon'
import { ConversationsSidebar } from '../../patterns/ConversationsSidebar'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import { PageBar } from '../SharedInboxes/SharedInboxesPage'
import { ACCOUNTS, CONTACTS, CUSTOMERS_PERIOD, FEW_ANSWERS, accountById, accountNps, contactById, conversationIdFor, fmtDate, latestForContact, npsGroup } from '../Nps/data'
import type { Account, Contact, NpsResponse } from '../Nps/data'
import type { NavTarget, Navigate } from '../Nps/nav'
import { NpsValue, ScoreTag, SelectMenu, SortHeader, SplitBar } from '../Nps/shared'
import type { SortDir } from '../Nps/shared'
import '../Nps/nps.css'

type View = 'accounts' | 'contacts'

/**
 * Customers (NPS spec §7, CSM): Accounts gets an NPS column, Contacts a Latest NPS column, and opening an account
 * shows its NPS, the split and each answering contact's latest score. Measured over the last 12 months.
 */
export function CustomersPage({ onNavigate, target }: { onNavigate?: Navigate; target?: NavTarget }) {
  const [view, setView] = useState<View>(target?.customersView ?? 'accounts')
  const [accountId, setAccountId] = useState<string | undefined>(target?.accountId)
  const openConversation = (conversationId: string) => onNavigate?.('conversations', { conversationId })

  return (
    <PageLayout
      variant="home"
      nav={<MainNav items={navSampleItems} footerItems={navSampleFooterItems} value="customers" onChange={(id) => onNavigate?.(id)} user={{ initial: 'J', name: 'John Cole' }} />}
      sidebar={(
        <ConversationsSidebar
          title="Customers" value={view} onChange={(id) => { setView(id as View); setAccountId(undefined) }}
          sections={[{ items: [{ id: 'accounts', label: 'Accounts', icon: 'building' }, { id: 'contacts', label: 'Contacts', icon: 'contact' }] }]}
        />
      )}
    >
      <div className="nps-page">
        {accountId ? <AccountView account={accountById(accountId)!} onBack={() => setAccountId(undefined)} onOpenConversation={openConversation} />
          : view === 'accounts' ? <AccountsList onOpen={setAccountId} />
          : <ContactsList onOpenAccount={setAccountId} onOpenConversation={openConversation} />}
      </div>
    </PageLayout>
  )
}

const ACCOUNT_FILTERS = [
  { value: 'all', label: 'All' }, { value: 'positive', label: 'Above 0' }, { value: 'negative', label: 'Below 0' }, { value: 'none', label: 'No answers' },
]

/** Sorts by a number, with empty values last whichever way it's sorted. */
function bySort<T>(rows: T[], dir: SortDir, get: (r: T) => number | null) {
  if (!dir) return rows
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b)
    if (x === null) return 1
    if (y === null) return -1
    return dir === 'asc' ? x - y : y - x
  })
}

function AccountsList({ onOpen }: { onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<SortDir>(null)
  const [filter, setFilter] = useState('all')
  const rows = ACCOUNTS.map((a) => ({ ...a, contacts: CONTACTS.filter((c) => c.accountId === a.id).length, ...accountNps(a.id, CUSTOMERS_PERIOD) }))
  const filtered = rows.filter((r) => filter === 'all' || (filter === 'none' ? r.nps === null : r.nps !== null && (filter === 'positive' ? r.nps > 0 : r.nps < 0)))
  type Row = (typeof rows)[number]
  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Account', render: (r) => <span className="nps-cell"><Icon name="building" size={14} /><span className="nps-score">{r.name}</span></span> },
    { key: 'domain', header: 'Domain' },
    { key: 'owner', header: 'Account owner' },
    { key: 'contacts', header: 'Contacts', align: 'right' },
    {
      key: 'nps', header: <SortHeader label="NPS" dir={sort} onChange={setSort} />, width: 200,
      render: (r) => r.nps === null ? <span className="nps-cell__muted">-</span> : (
        <span className="nps-cell" title={r.split.total < FEW_ANSWERS ? 'Based on few answers' : undefined}>
          <NpsValue value={r.nps} />
          <span className="nps-cell__muted">· {r.split.total} contact{r.split.total === 1 ? '' : 's'}{r.split.total < FEW_ANSWERS ? ' · few answers' : ''}</span>
        </span>
      ),
    },
  ]
  return (
    <>
      <PageBar title="Accounts" />
      <div className="nps-page__body">
        <div className="nps-toolbar">
          <SelectMenu label="NPS" icon="filter" value={filter} options={ACCOUNT_FILTERS} onChange={setFilter} />
          <span className="nps-toolbar__spacer" />
          <span className="nps-hint">NPS from chat over the last 12 months. Each contact counts once, with their latest answer.</span>
        </div>
        <Table aria-label="Accounts" columns={columns} rows={bySort(filtered, sort, (r) => r.nps)} getRowId={(r) => r.id} onRowClick={(r) => onOpen(r.id)} />
      </div>
    </>
  )
}

const CONTACT_FILTERS = [
  { value: 'all', label: 'All' }, { value: 'promoter', label: 'Promoters' }, { value: 'passive', label: 'Passives' }, { value: 'detractor', label: 'Detractors' }, { value: 'none', label: 'No answer' },
]

function ContactsList({ onOpenAccount, onOpenConversation }: { onOpenAccount: (id: string) => void; onOpenConversation: (id: string) => void }) {
  const [sort, setSort] = useState<SortDir>(null)
  const [filter, setFilter] = useState('all')
  type Row = Contact & { latest?: NpsResponse }
  const rows: Row[] = CONTACTS.map((c) => ({ ...c, latest: latestForContact(c.id) }))
  const filtered = rows.filter((r) => filter === 'all' || (filter === 'none' ? !r.latest : r.latest && npsGroup(r.latest.score) === filter))
  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="nps-score">{r.name}</span> },
    { key: 'email', header: 'Email' },
    {
      key: 'account', header: 'Account',
      render: (r) => { const a = accountById(r.accountId); return a ? <button type="button" className="nps-link" onClick={(e) => { e.stopPropagation(); onOpenAccount(a.id) }}>{a.name}</button> : <span className="nps-cell__muted">No account</span> },
    },
    {
      key: 'latest', header: <SortHeader label="Latest NPS" dir={sort} onChange={setSort} />, width: 240,
      render: (r) => r.latest ? <span className="nps-cell"><ScoreTag score={r.latest.score} /><span className="nps-cell__muted">{fmtDate(r.latest.date)}</span></span> : <span className="nps-cell__muted">-</span>,
    },
  ]
  return (
    <>
      <PageBar title="Contacts" />
      <div className="nps-page__body">
        <div className="nps-toolbar">
          <SelectMenu label="Latest NPS" icon="filter" value={filter} options={CONTACT_FILTERS} onChange={setFilter} />
          <span className="nps-toolbar__spacer" />
          <span className="nps-hint">Click a contact to open the conversation behind their latest score.</span>
        </div>
        <Table aria-label="Contacts" columns={columns} rows={bySort(filtered, sort, (r) => r.latest?.score ?? null)} getRowId={(r) => r.id}
          onRowClick={(r) => { if (r.latest) onOpenConversation(conversationIdFor(r.latest)) }} />
      </div>
    </>
  )
}

function AccountView({ account, onBack, onOpenConversation }: { account: Account; onBack: () => void; onOpenConversation: (id: string) => void }) {
  const { nps, split, latest } = accountNps(account.id, CUSTOMERS_PERIOD)
  const columns: TableColumn<NpsResponse>[] = [
    { key: 'contact', header: 'Contact', render: (r) => { const c = contactById(r.contactId)!; return <span className="nps-cell"><span className="nps-score">{c.name}</span><span className="nps-cell__muted">{c.email}</span></span> } },
    { key: 'score', header: 'Latest score', width: 160, render: (r) => <ScoreTag score={r.score} /> },
    { key: 'comment', header: 'Comment', render: (r) => r.comment ? <span className="nps-cell__comment" title={r.comment}>{r.comment}</span> : <span className="nps-cell__muted">-</span> },
    { key: 'date', header: 'Date', width: 110, render: (r) => fmtDate(r.date) },
    { key: 'open', header: '', width: 160, render: (r) => <button type="button" className="nps-link" onClick={(e) => { e.stopPropagation(); onOpenConversation(conversationIdFor(r)) }}>Open conversation</button> },
  ]
  return (
    <>
      <PageBar title={<span className="nps-cell"><Button iconOnly variant="ghost" size="xs" aria-label="Back to accounts" onClick={onBack}><Icon name="arrowback" size={16} /></Button>{account.name}</span>} />
      <div className="nps-page__body">
        <div className="nps-account-head">
          <span className="nps-hint">{account.domain} · Account owner {account.owner}</span>
        </div>
        <div className="nps-account-card">
          <div className="nps-big">
            <span className="nps-hint">Account NPS · last 12 months</span>
            <span className="nps-big__value"><NpsValue value={nps} /></span>
            <span className="nps-hint">{split.total} contact{split.total === 1 ? '' : 's'} answered</span>
          </div>
          {split.total > 0 && <SplitBar split={split} />}
        </div>
        {split.total > 0 && split.total < FEW_ANSWERS && (
          <div className="nps-note nps-note--warning"><Icon name="alerttriangle" size={14} /><span>Based on few answers: fewer than {FEW_ANSWERS} contacts at this account have answered.</span></div>
        )}
        <h2 className="nps-section-title">Contacts who answered</h2>
        {latest.length > 0
          ? <Table aria-label="Contacts who answered" columns={columns} rows={latest} getRowId={(r) => r.id} onRowClick={(r) => onOpenConversation(conversationIdFor(r))} />
          : <span className="nps-hint">No one at this account has answered the NPS question in the last 12 months.</span>}
        <div className="nps-note"><Icon name="info" size={14} /><span>Lowest score first. Each contact counts once, with their latest answer. Only contacts who chat are included.</span></div>
      </div>
    </>
  )
}
