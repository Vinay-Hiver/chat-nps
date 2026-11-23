import { Row } from '../../patterns/RightPanel/ChannelRightPanel'
import { CUSTOMERS_PERIOD, FEW_ANSWERS, GROUP_LABEL, accountById, accountNps, contactById, fmtDate, fmtNps, historyForContact, npsGroup } from './data'
import './nps.css'

/** Colour band for an account's NPS: red below 0, amber up to 29, green from 30. */
const band = (nps: number) => (nps < 0 ? 'detractor' : nps >= 30 ? 'promoter' : 'passive')

type Props = { contactId: string | undefined; onOpenConversation?: (id: string) => void; onOpenAccount: (id: string) => void }

/**
 * NPS rows inside the right panel's Contact details (spec §7, Agent or CSM): the contact's latest score with its group
 * and date, then their account as a link with the account's NPS, on one line.
 */
export function NpsContactRows({ contactId, onOpenAccount }: Props) {
  const contact = contactId ? contactById(contactId) : undefined
  if (!contact) return null
  const [latest] = historyForContact(contact.id)
  const account = accountById(contact.accountId)
  const accNps = account ? accountNps(account.id, CUSTOMERS_PERIOD).nps : null
  return (
    <>
      <Row icon="csat" label="Score">
        {latest ? (
          <span className="nps-rp__line">
            <span className={`nps-rp__num nps-rp__num--${npsGroup(latest.score)}`}>{latest.score} · {GROUP_LABEL[npsGroup(latest.score)]}</span>
            <span className="nps-rp__muted">{fmtDate(latest.date)}</span>
          </span>
        ) : '-'}
      </Row>
      {account && (
        <Row icon="building" label="Account">
          <span className="nps-rp__stack">
            <button type="button" className="nps-link nps-rp__accname" title={account.name} onClick={() => onOpenAccount(account.id)}>{account.name}</button>
            <span className="nps-rp__sub">(NPS: <span className={accNps === null ? undefined : `nps-rp__num nps-rp__num--${band(accNps)}`}>{fmtNps(accNps)}</span>)</span>
          </span>
        </Row>
      )}
    </>
  )
}

/**
 * The NPS row inside the right panel's Account details: the account's NPS over the last 12 months and how many
 * contacts it's based on.
 */
export function NpsAccountRows({ contactId }: Pick<Props, 'contactId'> & Partial<Props>) {
  const account = accountById(contactId ? contactById(contactId)?.accountId : undefined)
  if (!account) return null
  const acc = accountNps(account.id, CUSTOMERS_PERIOD)
  return (
    <Row icon="csat" label="NPS">
      {acc.nps === null ? '-' : (
        <span className="nps-rp__line">
          <span className={`nps-rp__num nps-rp__num--${band(acc.nps)}`}>{fmtNps(acc.nps)}</span>
          <span className="nps-rp__muted" aria-hidden="true">•</span>
          <span className="nps-rp__muted">{acc.split.total} contact{acc.split.total === 1 ? '' : 's'}{acc.split.total < FEW_ANSWERS ? ' · few answers' : ''}</span>
        </span>
      )}
    </Row>
  )
}

/** The contact's name, email and phone for Contact details, and their account's name and domain for Account details. */
export function contactValues(contactId: string | undefined): Record<string, string> | undefined {
  const c = contactId ? contactById(contactId) : undefined
  if (!c) return undefined
  const a = accountById(c.accountId)
  return { contactName: c.name, email: c.email, ...(c.phone ? { phone: c.phone } : {}), ...(a ? { accountName: a.name, domain: a.domain } : { accountName: 'No account', domain: '-' }) }
}
