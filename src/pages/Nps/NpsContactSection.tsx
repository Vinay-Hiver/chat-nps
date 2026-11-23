import { useState } from 'react'
import { Tag } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import { Row } from '../../patterns/RightPanel/ChannelRightPanel'
import { CUSTOMERS_PERIOD, FEW_ANSWERS, GROUP_COLOR, GROUP_LABEL, accountById, accountNps, contactById, conversationIdFor, fmtDate, fmtNps, historyForContact, npsGroup } from './data'
import './nps.css'

type Props = { contactId: string | undefined; onOpenConversation: (id: string) => void; onOpenAccount: (id: string) => void }

/**
 * NPS rows inside the right panel's Contact details (spec §7, Agent or CSM): the latest score with its group and date;
 * opening it lists earlier scores, each linked to its conversation; and the account's NPS with a link to the account.
 */
export function NpsContactRows({ contactId, onOpenConversation, onOpenAccount }: Props) {
  const [open, setOpen] = useState(false)
  const contact = contactId ? contactById(contactId) : undefined
  if (!contact) return null
  const [latest, ...earlier] = historyForContact(contact.id)
  const account = accountById(contact.accountId)
  const acc = account ? accountNps(account.id, CUSTOMERS_PERIOD) : undefined
  return (
    <>
      <Row icon="csat" label="NPS">
        {latest ? (
          <span className="nps-rp__value">
            <button type="button" className="nps-rp__toggle" aria-expanded={open} disabled={!earlier.length} onClick={() => setOpen((o) => !o)}
              aria-label={`Latest NPS ${latest.score}, ${GROUP_LABEL[npsGroup(latest.score)]}, ${fmtDate(latest.date)}${earlier.length ? '. Show earlier scores' : ''}`}>
              <Tag color={GROUP_COLOR[npsGroup(latest.score)]}>{latest.score} · {GROUP_LABEL[npsGroup(latest.score)]}</Tag>
              <span className="nps-rp__muted">{fmtDate(latest.date)}</span>
              {earlier.length > 0 && <Icon name={open ? 'chevrontop' : 'chevrondown'} size={14} />}
            </button>
            {open && earlier.map((r) => (
              <button key={r.id} type="button" className="nps-rp__earlier" onClick={() => onOpenConversation(conversationIdFor(r))} title={r.topic}>
                <Tag color={GROUP_COLOR[npsGroup(r.score)]}>{r.score}</Tag>
                <span className="nps-rp__muted">{fmtDate(r.date)}</span>
              </button>
            ))}
          </span>
        ) : '-'}
      </Row>
      {account && acc && (
        <Row icon="building" label="Account">
          <span className="nps-rp__value">
            <button type="button" className="nps-link nps-rp__acc" onClick={() => onOpenAccount(account.id)}>{account.name}</button>
            <span className="nps-rp__muted">NPS {fmtNps(acc.nps)} · {acc.split.total} contact{acc.split.total === 1 ? '' : 's'}{acc.split.total < FEW_ANSWERS ? ' · few answers' : ''}</span>
          </span>
        </Row>
      )}
    </>
  )
}

/** The contact's name, email and phone for the panel's Contact details. */
export function contactValues(contactId: string | undefined): Record<string, string> | undefined {
  const c = contactId ? contactById(contactId) : undefined
  return c ? { contactName: c.name, email: c.email, ...(c.phone ? { phone: c.phone } : {}) } : undefined
}
