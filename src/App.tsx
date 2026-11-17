// Opens on Admin Panel > Shared Inbox > Chat Inboxes. The Main nav switches between Conversations, Customers, Analytics and the Admin Panel.
// Chat NPS (Product Spec: NPS style chat CSAT): Admin › Chat-Support › CSAT sets the question; answers show in Conversations
// (thread and the NPS section of the right panel), Customers (Accounts, Contacts, an account) and Analytics › NPS.
// /chat-interaction is the visitor's side: an empty page with the launcher and the full chat flow.
// /options opens straight on Chat-Support > Widget Design with the four layout options and their switcher.
import { useState } from 'react'
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage'
import { ConversationsPage } from './pages/Conversations/ConversationsPage'
import { CustomersPage } from './pages/Customers/CustomersPage'
import type { NavTarget } from './pages/Nps/nav'
import { SharedInboxesPage } from './pages/SharedInboxes'
import { WidgetDesignOptionsPage } from './pages/WidgetDesignOptions/WidgetDesignOptionsPage'
import { ChatInteractionPage } from './pages/ChatInteraction/ChatInteractionPage'

const path = window.location.pathname.replace(/\/$/, '')
const isOptions = path === '/options'

type Page = 'conversations' | 'admin' | 'customers' | 'analytics'
const PAGES: Page[] = ['conversations', 'admin', 'customers', 'analytics']

export default function App() {
  // `visit` changes on every navigation, so a link to another account or conversation re-opens the page there.
  const [route, setRoute] = useState<{ page: Page; target?: NavTarget; visit: number }>({ page: 'admin', visit: 0 })
  const navigate = (id: string, target?: NavTarget) => {
    if (PAGES.includes(id as Page)) setRoute((r) => ({ page: id as Page, target, visit: r.visit + 1 }))
  }
  const key = route.visit
  if (path === '/chat-interaction') return <ChatInteractionPage />
  if (route.page === 'admin' && isOptions) {
    return <SharedInboxesPage channel="chat" inboxId="chat-support" settingsItem="widgetDesign" widgetDesign={WidgetDesignOptionsPage} onNavigate={navigate} />
  }
  if (route.page === 'customers') return <CustomersPage key={key} onNavigate={navigate} target={route.target} />
  if (route.page === 'analytics') return <AnalyticsPage key={key} onNavigate={navigate} />
  if (route.page === 'conversations') return <ConversationsPage key={key} onNavigate={navigate} initialConversationId={route.target?.conversationId} />
  return <SharedInboxesPage channel="chat" onNavigate={navigate} />
}
