import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button'
import { Icon } from '../../icons/Icon'
import { ChannelRightPanel } from '../../patterns/RightPanel/ChannelRightPanel'
import { ChatPanel } from '../Conversations/ChatPanel'
import { CHAT_INBOX, chatConversations } from '../Conversations/data'
import { NpsAccountRows, NpsContactRows, contactValues } from '../Nps/NpsContactSection'
import '../Conversations/ConversationsPage.css'

/**
 * A conversation opened from Customers, over the page (like the product): a tab with the conversation's name and a
 * close button on top, the chat thread, and the chat right panel with NPS in Contact details. The page stays where it was.
 */
export function ConversationModal({ conversationId, onOpenConversation, onOpenAccount, onClose }: {
  conversationId: string
  onOpenConversation: (id: string) => void
  onOpenAccount: (id: string) => void
  onClose: () => void
}) {
  const conversation = chatConversations.find((c) => c.id === conversationId)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    topRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!conversation) return null
  return (
    <div className="cust-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cust-modal__box" role="dialog" aria-modal="true" aria-label={`Conversation with ${conversation.title}`}>
        <div className="cust-modal__top" ref={topRef}>
          <span className="cust-modal__tab">{conversation.title}</span>
          <Button iconOnly variant="ghost" size="sm" aria-label="Close conversation" onClick={onClose}><Icon name="close" size={16} /></Button>
        </div>
        <div className="cust-modal__body">
          <ChatPanel key={conversation.id} conversation={conversation} />
          <div className="cust-modal__panel">
            <ChannelRightPanel
              channel="chat" inboxName={CHAT_INBOX.name} unassigned={conversation.view !== 'mine'} conversationId={conversation.id}
              status={conversation.closed ? 'closed' : undefined}
              values={contactValues(conversation.contactId)} expandedSections={['contact', 'account']}
              sectionExtras={{
            contact: <NpsContactRows key={conversation.id} contactId={conversation.contactId} onOpenConversation={onOpenConversation} onOpenAccount={onOpenAccount} />,
            account: <NpsAccountRows key={conversation.id} contactId={conversation.contactId} onOpenAccount={onOpenAccount} />,
          }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
