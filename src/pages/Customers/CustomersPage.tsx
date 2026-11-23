import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { Input } from '../../components/Input'
import { Popover } from '../../components/Popover'
import { Table } from '../../components/Table'
import type { TableColumn } from '../../components/Table'
import { Tabs } from '../../components/Tabs'
import { Tag } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import {
  ACCOUNTS, CONTACTS, CUSTOMERS_PERIOD, FEW_ANSWERS, INBOX_LABEL, accountById, accountNps, contactById, contactsOf, conversationIdFor, fmtDate,
  historyForContact, latestForContact, npsGroup,
} from '../Nps/data'
import type { Account, Contact, NpsResponse } from '../Nps/data'
import type { NavTarget, Navigate } from '../Nps/nav'
import { NpsValue, ScoreTag, SortHeader } from '../Nps/shared'
import type { SortDir } from '../Nps/shared'
import '../Nps/nps.css'
import { AccountInsights } from './AccountInsights'
import { ConversationModal } from './ConversationModal'
import './CustomersPage.css'

type View = 'accounts' | 'contacts'
type Open = { kind: 'account'; id: string } | { kind: 'contact'; id: string; fromAccount?: string } | null

/**
 * Customers, rebuilt from the product screens (web-screens/): Accounts and Contacts lists, an account (Overview,
 * Conversations, Contacts) and a contact (Conversations, Activity). NPS sits where the spec puts it (§7, CSM): an NPS
 * column on Accounts, Latest NPS on Contacts, and the account's NPS and split in Account details. Measured over
 * the last 12 months.
 */
export function CustomersPage({ onNavigate, target }: { onNavigate?: Navigate; target?: NavTarget }) {
  const [view, setView] = useState<View>(target?.customersView ?? (target?.contactId ? 'contacts' : 'accounts'))
  const [open, setOpen] = useState<Open>(target?.accountId ? { kind: 'account', id: target.accountId } : target?.contactId ? { kind: 'contact', id: target.contactId } : null)
  // Conversations open in a modal over Customers, like the product, so the page stays where it was.
  const [conversationId, setConversationId] = useState<string | null>(null)
  const openConversation = (id: string) => setConversationId(id)
  const openAccount = (id: string) => setOpen({ kind: 'account', id })
  const openContact = (id: string, fromAccount?: string) => setOpen({ kind: 'contact', id, fromAccount })
  const toList = (v: View) => { setView(v); setOpen(null) }

  return (
    <PageLayout
      variant="home" className="cust-layout"
      nav={<MainNav items={navSampleItems} footerItems={navSampleFooterItems} value="customers" onChange={(id) => onNavigate?.(id)} user={{ initial: 'J', name: 'John Cole' }} />}
      sidebar={null}
    >
      <div className="cust">
        <header className="cust-top">
          <span className="cust-top__title"><Icon name="contact" size={16} />Customers</span>
          <span className="cust-top__search"><Input search size="sm" fullWidth placeholder="Search" aria-label="Search customers" /></span>
        </header>
        <div className="cust-body">
          {open?.kind === 'account' ? (
            <AccountView account={accountById(open.id)!} onBack={() => toList('accounts')} onOpenContact={(id) => openContact(id, open.id)} onOpenConversation={openConversation} />
          ) : open?.kind === 'contact' ? (
            <ContactView
              contact={contactById(open.id)!} fromAccount={accountById(open.fromAccount)}
              onBack={() => toList('contacts')} onOpenAccount={openAccount} onOpenConversation={openConversation}
            />
          ) : (
            <>
              <Tabs tabs={[{ value: 'accounts', label: 'Accounts' }, { value: 'contacts', label: 'Contacts' }]} value={view} onChange={(v) => toList(v as View)} aria-label="Customers" />
              {view === 'accounts' ? <AccountsList onOpen={openAccount} /> : <ContactsList onOpen={(id) => openContact(id)} onOpenAccount={openAccount} />}
            </>
          )}
        </div>
      </div>
      {conversationId && (
        <ConversationModal
          conversationId={conversationId} onOpenConversation={setConversationId} onClose={() => setConversationId(null)}
          onOpenAccount={(id) => { setConversationId(null); openAccount(id) }}
        />
      )}
    </PageLayout>
  )
}

/* ---------- shared bits ---------- */

const AVATAR_COLORS = ['violet', 'green', 'orange', 'lightBlue', 'purple', 'red', 'yellow'] as const
const avatarColor = (id: string) => AVATAR_COLORS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length]
const Dash = () => <span className="cust-muted">-</span>

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

/** The filter icon button, opening a radio list. */
function FilterButton({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <span ref={ref} className={`cust-anchor${value !== 'all' ? ' cust-anchor--on' : ''}`}>
        <Button iconOnly variant="secondary" size="sm" aria-label={`Filter by ${label}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Icon name="filter" size={16} /></Button>
      </span>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} placement="bottom-end">
        <Dropdown title={label} variant="radio" value={value} options={options} onChange={(v) => { onChange(Array.isArray(v) ? v[0] : v); setOpen(false) }} />
      </Popover>
    </>
  )
}

/** The bar on top of a list card: the count on the left, the table tools and the actions on the right. */
function CardBar({ count, filter, settings, createLabel }: { count: string; filter: ReactNode; settings?: boolean; createLabel: string }) {
  return (
    <div className="cust-card__bar">
      <span className="cust-card__count">{count}</span>
      <span className="cust-card__tools">
        {filter}
        <Button iconOnly variant="secondary" size="sm" aria-label="Columns"><Icon name="splitview" size={16} /></Button>
        <Button iconOnly variant="secondary" size="sm" aria-label="Row height"><Icon name="listview" size={16} /></Button>
        {settings && <Button iconOnly variant="secondary" size="sm" aria-label="Settings"><Icon name="setting" size={16} /></Button>}
        <Button variant="secondary" size="sm" iconLeft={<Icon name="share" size={16} />}>Export</Button>
        <Button variant="primary" size="sm">Import</Button>
        <Button variant="secondary" size="sm">{createLabel}</Button>
      </span>
    </div>
  )
}

/** "Accounts › Rivermill Plastics" above an open account or contact. */
function Crumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="cust-crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={it.label} className="cust-crumbs__item">
          {i > 0 && <Icon name="chevronright" size={14} />}
          {it.onClick ? <button type="button" onClick={it.onClick}>{it.label}</button> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

/** A label and value row in the details card, with an icon. */
function DetailRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return <div className="cust-detail"><span className="cust-detail__label"><Icon name={icon} size={16} />{label}</span><span className="cust-detail__value">{children}</span></div>
}

/** "Additional details": custom fields, collapsible. */
function MoreDetails({ fields }: { fields: [string, ReactNode][] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="cust-more">
      <button type="button" className="cust-more__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? 'chevrondown' : 'chevronright'} size={16} />Additional details
      </button>
      {open && fields.map(([k, v]) => <div key={k} className="cust-more__row"><span>{k}</span><span>{v || '-'}</span></div>)}
    </div>
  )
}

/** One conversation as a card: contact, status and NPS on top, the topic under it, date and inbox on the right. */
function ConversationCard({ r, onOpen }: { r: NpsResponse; onOpen: () => void }) {
  const c = contactById(r.contactId)!
  return (
    <button type="button" className="cust-conv" onClick={onOpen}>
      <span className="cust-conv__main">
        <span className="cust-conv__line">
          <Icon name="conversation" size={16} />
          <span className="cust-conv__name">{c.name}</span>
          <span className="cust-conv__sep" />
          <span className="cust-conv__status"><Icon name="closedstatus" size={16} />Closed</span>
          <ScoreTag score={r.score} />
        </span>
        <span className="cust-conv__topic">{r.topic}</span>
      </span>
      <span className="cust-conv__side">
        <span>{fmtDate(r.date)}</span>
        <span className="cust-conv__inbox"><Icon name="chatinbox" size={14} />{INBOX_LABEL[r.inbox]}</span>
      </span>
    </button>
  )
}

/* ---------- Accounts list ---------- */

const ACCOUNT_FILTERS = [
  { value: 'all', label: 'All' }, { value: 'positive', label: 'NPS above 0' }, { value: 'negative', label: 'NPS below 0' }, { value: 'none', label: 'No NPS answers' },
]

function AccountsList({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState<SortDir>(null)
  const [filter, setFilter] = useState('all')
  const rows = ACCOUNTS.map((a) => ({ ...a, contacts: contactsOf(a.id).length, ...accountNps(a.id, CUSTOMERS_PERIOD) }))
  const atRisk = rows.filter((r) => r.atRisk)
  const shown = (tab === 'risk' ? atRisk : rows)
    .filter((r) => filter === 'all' || (filter === 'none' ? r.nps === null : r.nps !== null && (filter === 'positive' ? r.nps > 0 : r.nps < 0)))
  type Row = (typeof rows)[number]
  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Account name', width: '20%', render: (r) => <span className="cust-strong">{r.name}</span> },
    { key: 'domain', header: 'Domain', width: '18%', render: (r) => <Tag>{r.domain}</Tag> },
    {
      key: 'nps', header: <SortHeader label="NPS" dir={sort} onChange={setSort} />, width: '16%',
      render: (r) => r.nps === null ? <Dash /> : (
        <span className="nps-cell" title={r.split.total < FEW_ANSWERS ? `Based on few answers: fewer than ${FEW_ANSWERS} contacts` : undefined}>
          <NpsValue value={r.nps} /><span className="nps-cell__muted">· {r.split.total} contact{r.split.total === 1 ? '' : 's'}</span>
        </span>
      ),
    },
    { key: 'contacts', header: 'Contacts' },
    { key: 'owner', header: 'Account owner' },
    { key: 'closeDate', header: 'Close date', render: (r) => r.closeDate ?? <Dash /> },
    { key: 'country', header: 'Country' },
    { key: 'mrr', header: 'MRR', render: (r) => r.mrr ?? <Dash /> },
  ]
  return (
    <section className="cust-card" aria-label="Accounts">
      <CardBar count={`${shown.length} accounts`} settings createLabel="Create account" filter={<FilterButton label="NPS" value={filter} options={ACCOUNT_FILTERS} onChange={setFilter} />} />
      <div className="cust-card__tabs">
        <Tabs tabs={[{ value: 'all', label: 'All', count: String(rows.length) }, { value: 'risk', label: 'At Risk', count: String(atRisk.length) }]} value={tab} onChange={setTab} aria-label="Account list" />
      </div>
      <Table aria-label="Accounts" columns={columns} rows={bySort(shown, sort, (r) => r.nps)} getRowId={(r) => r.id} onRowClick={(r) => onOpen(r.id)} />
      <p className="cust-foot">NPS from chat over the last 12 months. Each contact counts once, with their latest answer.</p>
    </section>
  )
}

/* ---------- Contacts list ---------- */

const CONTACT_FILTERS = [
  { value: 'all', label: 'All' }, { value: 'promoter', label: 'Promoters' }, { value: 'passive', label: 'Passives' }, { value: 'detractor', label: 'Detractors' }, { value: 'none', label: 'No NPS answer' },
]

function ContactsList({ onOpen, onOpenAccount }: { onOpen: (id: string) => void; onOpenAccount: (id: string) => void }) {
  const [sort, setSort] = useState<SortDir>(null)
  const [filter, setFilter] = useState('all')
  type Row = Contact & { latest?: NpsResponse }
  const rows: Row[] = CONTACTS.map((c) => ({ ...c, latest: latestForContact(c.id) }))
  const shown = rows.filter((r) => filter === 'all' || (filter === 'none' ? !r.latest : r.latest && npsGroup(r.latest.score) === filter))
  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Name', width: '18%', render: (r) => <span className="nps-cell"><Avatar initial={r.name[0]} size="small" color={avatarColor(r.id)} />{r.name}</span> },
    { key: 'email', header: 'Email', width: '20%', render: (r) => <span className="cust-email">{r.email}</span> },
    { key: 'phone', header: 'Phone number', render: (r) => r.phone ?? <Dash /> },
    {
      key: 'account', header: 'Account',
      render: (r) => { const a = accountById(r.accountId); return a ? <button type="button" className="nps-link cust-link" onClick={(e) => { e.stopPropagation(); onOpenAccount(a.id) }}>{a.name}</button> : <Dash /> },
    },
    {
      key: 'latest', header: <SortHeader label="Latest NPS" dir={sort} onChange={setSort} />, width: '18%',
      render: (r) => r.latest ? <span className="nps-cell"><ScoreTag score={r.latest.score} /><span className="nps-cell__muted">{fmtDate(r.latest.date)}</span></span> : <Dash />,
    },
    { key: 'country', header: 'Country', render: (r) => r.country ?? <Dash /> },
  ]
  return (
    <section className="cust-card" aria-label="Contacts">
      <CardBar count={`${shown.length} contacts`} createLabel="Create contact" filter={<FilterButton label="Latest NPS" value={filter} options={CONTACT_FILTERS} onChange={setFilter} />} />
      <Table aria-label="Contacts" columns={columns} rows={bySort(shown, sort, (r) => r.latest?.score ?? null)} getRowId={(r) => r.id} onRowClick={(r) => onOpen(r.id)} />
    </section>
  )
}

/* ---------- An account ---------- */

function AccountView({ account, onBack, onOpenContact, onOpenConversation }: { account: Account; onBack: () => void; onOpenContact: (id: string) => void; onOpenConversation: (id: string) => void }) {
  const [tab, setTab] = useState('overview')
  const contacts = contactsOf(account.id)
  const conversations = contacts.flatMap((c) => historyForContact(c.id)).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <Crumbs items={[{ label: 'Accounts', onClick: onBack }, { label: account.name }]} />
      <div className="cust-split">
        <aside className="cust-panel" aria-label="Account details">
          <div className="cust-panel__head"><Icon name="document" size={16} />Account details</div>
          <div className="cust-panel__body">
            <DetailRow icon="building" label="Account">{account.name}</DetailRow>
            <DetailRow icon="domain" label="Domain"><Tag>{account.domain}</Tag></DetailRow>
            <DetailRow icon="contact" label="Contacts">{contacts.length}</DetailRow>
            <hr className="cust-rule" />
            <MoreDetails fields={[['Account Owner', account.owner], ['CS Rep', account.csRep], ['Close Date', account.closeDate], ['Country', account.country], ['MRR', account.mrr]]} />
          </div>
        </aside>
        <section className="cust-main">
          <div className="cust-main__tabs">
            <Tabs tabs={[{ value: 'overview', label: 'Overview' }, { value: 'conversations', label: 'Conversations' }, { value: 'contacts', label: 'Contacts' }]} value={tab} onChange={setTab} aria-label="Account" />
          </div>
          {tab === 'overview' ? <AccountInsights account={account} conversations={conversations} onOpenConversation={onOpenConversation} onOpenContact={onOpenContact} onSeeConversations={() => setTab('conversations')} onSeeContacts={() => setTab('contacts')} />
            : tab === 'conversations' ? (
              <div className="cust-convs">
                {conversations.length ? conversations.map((r) => <ConversationCard key={r.id} r={r} onOpen={() => onOpenConversation(conversationIdFor(r))} />)
                  : <p className="cust-empty">No conversations with this account yet.</p>}
              </div>
            ) : <AccountContacts contacts={contacts} onOpen={onOpenContact} />}
        </section>
      </div>
    </>
  )
}


function AccountContacts({ contacts, onOpen }: { contacts: Contact[]; onOpen: (id: string) => void }) {
  const columns: TableColumn<Contact>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="nps-cell"><Avatar initial={r.name[0]} size="small" color={avatarColor(r.id)} />{r.name}</span> },
    { key: 'email', header: 'Email', render: (r) => <span className="cust-email">{r.email}</span> },
    { key: 'phone', header: 'Phone', render: (r) => r.phone ?? <Dash /> },
    { key: 'latest', header: 'Latest NPS', render: (r) => { const l = latestForContact(r.id); return l ? <span className="nps-cell"><ScoreTag score={l.score} /><span className="nps-cell__muted">{fmtDate(l.date)}</span></span> : <Dash /> } },
  ]
  return <Table aria-label="Contacts" columns={columns} rows={contacts} getRowId={(r) => r.id} onRowClick={(r) => onOpen(r.id)} />
}

/* ---------- A contact ---------- */

function ContactView({ contact, fromAccount, onBack, onOpenAccount, onOpenConversation }: {
  contact: Contact; fromAccount?: Account; onBack: () => void; onOpenAccount: (id: string) => void; onOpenConversation: (id: string) => void
}) {
  const [tab, setTab] = useState('conversations')
  const account = accountById(contact.accountId)
  const history = historyForContact(contact.id)
  return (
    <>
      <Crumbs items={fromAccount
        ? [{ label: 'Accounts', onClick: onBack }, { label: fromAccount.name, onClick: () => onOpenAccount(fromAccount.id) }, { label: contact.name }]
        : [{ label: 'Contacts', onClick: onBack }, { label: contact.name }]} />
      <div className="cust-split">
        <aside className="cust-panel" aria-label="Contact details">
          <div className="cust-panel__head"><Icon name="document" size={16} />Contact details<Button iconOnly variant="ghost" size="xs" aria-label="Edit contact"><Icon name="edit" size={16} /></Button></div>
          <div className="cust-panel__body">
            <span className="cust-person"><Avatar initial={contact.name[0]} color={avatarColor(contact.id)} />{contact.name}</span>
            <DetailRow icon="emailinbox" label="Email"><span className="cust-email">{contact.email}</span></DetailRow>
            <DetailRow icon="phone" label="Phone">{contact.phone ?? '-'}</DetailRow>
            <DetailRow icon="building" label="Account">
              {account ? <button type="button" className="nps-link cust-link" onClick={() => onOpenAccount(account.id)}>{account.name}</button> : '-'}
            </DetailRow>
            <hr className="cust-rule" />
            <MoreDetails fields={[['Country', contact.country], ['Contact Owner', account?.owner], ['Plan', account ? 'Business' : undefined], ['MRR', account?.mrr]]} />
          </div>
        </aside>
        <section className="cust-main">
          <div className="cust-main__tabs">
            <Tabs tabs={[{ value: 'conversations', label: 'Conversations' }, { value: 'activity', label: 'Activity' }]} value={tab} onChange={setTab} aria-label="Contact" />
          </div>
          {tab === 'conversations' ? (
            <div className="cust-convs">
              {history.length ? history.map((r) => <ConversationCard key={r.id} r={r} onOpen={() => onOpenConversation(conversationIdFor(r))} />)
                : <p className="cust-empty">No conversations with this contact yet.</p>}
            </div>
          ) : (
            <ol className="cust-activity">
              {history.length ? history.map((r) => (
                <li key={r.id}>
                  <span className="cust-activity__dot" />
                  <span className="cust-activity__text">
                    <span>Answered the NPS question <ScoreTag score={r.score} /></span>
                    <span className="nps-cell__muted">{fmtDate(r.date)} · {INBOX_LABEL[r.inbox]} · {r.topic}</span>
                  </span>
                </li>
              )) : <p className="cust-empty">No activity yet.</p>}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
