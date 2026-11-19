import { Tag } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import { RightPanelSection } from '../../patterns/RightPanel'
import { CUSTOMERS_PERIOD, FEW_ANSWERS, GROUP_COLOR, GROUP_LABEL, accountById, accountNps, contactById, conversationIdFor, fmtDate, fmtNps, historyForContact, npsGroup } from './data'
import './nps.css'

/**
 * The contact panel's NPS section (spec §7, Agent or CSM): the latest score, its date and group, earlier scores each
 * linked to their conversation, and the account's NPS with a link to the account.
 * Returned as a RightPanelSection element (not a component) because the panel only sorts its own section elements.
 */
export function npsContactSection(contactId: string | undefined, onOpenConversation: (id: string) => void, onOpenAccount: (id: string) => void) {
  const contact = contactId ? contactById(contactId) : undefined
  if (!contact) return []
  const history = historyForContact(contact.id)
  const [latest, ...earlier] = history
  const account = accountById(contact.accountId)
  const acc = account ? accountNps(account.id, CUSTOMERS_PERIOD) : undefined
  return [
    <RightPanelSection key="nps" id="nps" title="NPS" icon="csat" defaultExpanded>
      <div className="nps-rp">
        <div className="nps-rp__contact">
          <span className="nps-rp__name">{contact.name}</span>
          <span className="nps-rp__muted">{contact.email}</span>
        </div>
        {latest ? (
          <div className="nps-rp__latest">
            <span className="nps-rp__label">Latest score</span>
            <div className="nps-rp__score-row">
              <span className="nps-rp__score">{latest.score}</span>
              <Tag color={GROUP_COLOR[npsGroup(latest.score)]}>{GROUP_LABEL[npsGroup(latest.score)]}</Tag>
              <span className="nps-rp__muted">{fmtDate(latest.date)}</span>
            </div>
            {latest.comment && <p className="nps-rp__comment">“{latest.comment}”</p>}
          </div>
        ) : <span className="nps-rp__muted">No NPS answers yet.</span>}

        {earlier.length > 0 && (
          <div className="nps-rp__history">
            <span className="nps-rp__label">Earlier scores</span>
            {earlier.map((r) => (
              <button key={r.id} type="button" className="nps-rp__history-row" onClick={() => onOpenConversation(conversationIdFor(r))}>
                <Tag color={GROUP_COLOR[npsGroup(r.score)]}>{r.score}</Tag>
                <span className="nps-rp__history-topic">{r.topic}</span>
                <span className="nps-rp__muted">{fmtDate(r.date)}</span>
              </button>
            ))}
          </div>
        )}

        {account && acc && (
          <button type="button" className="nps-rp__account" onClick={() => onOpenAccount(account.id)}>
            <Icon name="building" size={14} />
            <span className="nps-rp__account-text">
              <span className="nps-rp__account-name">{account.name}</span>
              <span className="nps-rp__muted">
                Account NPS {fmtNps(acc.nps)} · {acc.split.total} contact{acc.split.total === 1 ? '' : 's'}{acc.split.total < FEW_ANSWERS ? ' · few answers' : ''}
              </span>
            </span>
            <Icon name="chevronright" size={14} />
          </button>
        )}
      </div>
    </RightPanelSection>,
  ]
}
