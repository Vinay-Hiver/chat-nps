/** Where a link between Conversations, Customers and Analytics should land. */
export type NavTarget = { accountId?: string; conversationId?: string; customersView?: 'accounts' | 'contacts' }
export type Navigate = (id: string, target?: NavTarget) => void
