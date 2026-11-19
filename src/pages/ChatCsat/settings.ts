import { useState } from 'react'

/** Settings for a chat inbox's end-of-chat survey (Product Spec: NPS style chat CSAT, §6–7). */
export type SurveyType = 'rating' | 'nps'
export type NpsPeriod = 30 | 60 | 90 | 180
export type AnswerStyle = 'emoji' | 'text'
export type AnswerOrder = 'good-first' | 'bad-first'

export type CsatSettings = {
  /** Ask a question when the chat ends. */
  enabled: boolean
  /** One question per widget: today's rating, or NPS. Never both. */
  type: SurveyType
  /** NPS question wording. */
  npsQuestion: string
  /** Ask for a comment after the score. */
  npsComment: boolean
  npsCommentPrompt: string
  /** Word the comment prompt by the visitor's score instead of one prompt for every score. */
  npsPromptByScore: boolean
  npsPromptDetractor: string
  npsPromptPassive: string
  npsPromptPromoter: string
  /** Ask the same contact at most once in this many days. */
  npsPeriod: NpsPeriod
  npsLowLabel: string
  npsHighLabel: string
  npsPlaceholder: string
  npsButton: string
  npsThanks: string
  /** Conversation rating text. */
  ratingQuestion: string
  ratingStyle: AnswerStyle
  ratingOrder: AnswerOrder
  /** Answer labels, worst to best. */
  ratingBad: string
  ratingOkay: string
  ratingGood: string
  ratingPlaceholder: string
  ratingButton: string
  ratingThanks: string
}

/** The account's company name, filled into the default NPS question. */
export const COMPANY_NAME = 'Hiver'
export const RATING_QUESTION = 'How was your conversation experience with us?'
export const DEFAULT_NPS_QUESTION = `How likely are you to recommend ${COMPANY_NAME} to a friend or colleague?`
export const DEFAULT_COMMENT_PROMPT = 'What’s the main reason for your score?'
export const DEFAULT_PROMPTS = {
  npsPromptDetractor: 'What should we fix first?',
  npsPromptPassive: 'What would make it a 10?',
  npsPromptPromoter: 'What do you like most?',
} as const
export const NPS_PERIODS: NpsPeriod[] = [30, 60, 90, 180]
export const COMMENT_MAX = 1000
/** Character limits for the visitor-facing text. */
export const LIMITS = { prompt: 100, question: 50, npsQuestion: 150, answer: 20, placeholder: 50, button: 25, thanks: 100 }

export const DEFAULT_CSAT: CsatSettings = {
  enabled: true,
  type: 'rating',
  npsQuestion: DEFAULT_NPS_QUESTION,
  npsComment: true,
  npsCommentPrompt: DEFAULT_COMMENT_PROMPT,
  npsPromptByScore: true,
  ...DEFAULT_PROMPTS,
  npsPeriod: 90,
  npsLowLabel: 'Not likely',
  npsHighLabel: 'Very likely',
  npsPlaceholder: 'Optional',
  npsButton: 'Submit',
  npsThanks: 'Thank you for your feedback!',
  ratingQuestion: RATING_QUESTION,
  ratingStyle: 'emoji',
  ratingOrder: 'good-first',
  ratingBad: 'Not satisfied',
  ratingOkay: 'Okay',
  ratingGood: 'Satisfied',
  ratingPlaceholder: 'Would you like to add any comments?',
  ratingButton: 'Submit',
  ratingThanks: 'Thank you for your feedback!',
}

/** Fields the survey can't show empty. */
export const REQUIRED: (keyof CsatSettings)[] = ['ratingQuestion', 'ratingBad', 'ratingOkay', 'ratingGood', 'ratingButton', 'ratingThanks', 'npsQuestion', 'npsButton', 'npsThanks']
export const missing = (s: CsatSettings, k: keyof CsatSettings) => typeof s[k] === 'string' && !(s[k] as string).trim()
/** Only the fields for the chosen question type block saving. */
export const hasErrors = (s: CsatSettings) => s.enabled && REQUIRED.filter((k) => k.startsWith(s.type)).some((k) => missing(s, k))

export type NpsGroup = 'promoter' | 'passive' | 'detractor'
export const npsGroup = (score: number): NpsGroup => (score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor')
export const NPS_GROUP_LABEL: Record<NpsGroup, string> = { promoter: 'Promoter', passive: 'Passive', detractor: 'Detractor' }

export const npsQuestionShown = (s: CsatSettings) => s.npsQuestion.trim() || DEFAULT_NPS_QUESTION
const PROMPT_KEY = { detractor: 'npsPromptDetractor', passive: 'npsPromptPassive', promoter: 'npsPromptPromoter' } as const
/** The comment prompt for a score: by group when that's on, otherwise the one prompt. Empty fields fall back to the default. */
export const commentPromptShown = (s: CsatSettings, score?: number | null) => {
  if (!s.npsPromptByScore || score == null) return s.npsCommentPrompt.trim() || DEFAULT_COMMENT_PROMPT
  const k = PROMPT_KEY[npsGroup(score)]
  return s[k].trim() || DEFAULT_PROMPTS[k]
}

/** Saved settings, the draft being edited, and whether they differ. The preview shows the draft. */
export function useCsatSettings() {
  const [saved, setSaved] = useState<CsatSettings>(DEFAULT_CSAT)
  const [draft, setDraft] = useState<CsatSettings>(DEFAULT_CSAT)
  const set = <K extends keyof CsatSettings>(key: K, value: CsatSettings[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = (Object.keys(draft) as (keyof CsatSettings)[]).some((k) => draft[k] !== saved[k])
  return { settings: draft, saved, set, dirty, save: () => setSaved(draft), discard: () => setDraft(saved) }
}

export type CsatSettingsApi = ReturnType<typeof useCsatSettings>
