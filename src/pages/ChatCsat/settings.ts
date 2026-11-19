import { useState } from 'react'

/** Settings for a chat inbox's end-of-chat survey (Product Spec: NPS style chat CSAT, §6–7). */
export type SurveyType = 'rating' | 'nps'
export type AnswerOrder = 'good-first' | 'bad-first'
/** Days before the same contact can be asked the NPS question again. */
export type NpsPeriod = 30 | 60 | 90 | 180
export const NPS_PERIODS: NpsPeriod[] = [30, 60, 90, 180]

export type CsatSettings = {
  /** Ask a question when the chat ends. */
  enabled: boolean
  /** One question per widget: today's rating, or NPS. Never both. */
  type: SurveyType
  /** NPS question wording. */
  npsQuestion: string
  /** Which end of the 0–10 scale comes first. */
  npsOrder: AnswerOrder
  /** Asked at most once in this many days per contact (PRD §7). */
  npsPeriod: NpsPeriod
  npsLowLabel: string
  npsHighLabel: string
  npsPlaceholder: string
  npsButton: string
  npsThanks: string
  /** Conversation rating text. */
  ratingQuestion: string
  ratingOrder: AnswerOrder
  /** Answer labels, worst to best. */
  ratingBad: string
  ratingOkay: string
  ratingGood: string
  ratingPlaceholder: string
  ratingButton: string
  ratingThanks: string
}

export const RATING_QUESTION = 'How happy are you with the help you got?'
export const COMMENT_MAX = 1000
/** Character limits for the visitor-facing text. */
export const LIMITS = { question: 50, npsQuestion: 150, answer: 20, placeholder: 50, button: 25, thanks: 100 }

export const DEFAULT_CSAT: CsatSettings = {
  enabled: true,
  type: 'rating',
  npsQuestion: RATING_QUESTION,
  npsOrder: 'bad-first',
  npsPeriod: 90,
  npsLowLabel: 'Poor',
  npsHighLabel: 'Excellent',
  npsPlaceholder: 'Additional comments (optional)',
  npsButton: 'Submit',
  npsThanks: 'Thank you for your feedback!',
  ratingQuestion: RATING_QUESTION,
  ratingOrder: 'good-first',
  ratingBad: 'Not satisfied',
  ratingOkay: 'Okay',
  ratingGood: 'Satisfied',
  ratingPlaceholder: 'Additional comments (optional)',
  ratingButton: 'Submit',
  ratingThanks: 'Thank you for your feedback!',
}

/** Fields the survey can't show empty. */
export const REQUIRED: (keyof CsatSettings)[] = ['ratingQuestion', 'ratingBad', 'ratingOkay', 'ratingGood', 'ratingButton', 'ratingThanks', 'npsQuestion', 'npsLowLabel', 'npsHighLabel', 'npsButton', 'npsThanks']
export const missing = (s: CsatSettings, k: keyof CsatSettings) => typeof s[k] === 'string' && !(s[k] as string).trim()
/** Only the fields for the chosen question type block saving. */
export const hasErrors = (s: CsatSettings) => s.enabled && REQUIRED.filter((k) => k.startsWith(s.type)).some((k) => missing(s, k))

export type NpsGroup = 'promoter' | 'passive' | 'detractor'
export const npsGroup = (score: number): NpsGroup => (score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor')
export const NPS_GROUP_LABEL: Record<NpsGroup, string> = { promoter: 'Promoter', passive: 'Passive', detractor: 'Detractor' }

/** Saved settings, the draft being edited, and whether they differ. The preview shows the draft. */
const KEY = 'hot-csat-settings'

/** The last saved settings (shared with the visitor's chat in /chat-interaction), or the defaults. */
export function loadCsat(): CsatSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_CSAT, ...JSON.parse(raw) } : DEFAULT_CSAT
  } catch {
    return DEFAULT_CSAT
  }
}

function saveCsat(s: CsatSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage refused: this tab still has them */ }
}

export function useCsatSettings() {
  const [saved, setSaved] = useState<CsatSettings>(loadCsat)
  const [draft, setDraft] = useState<CsatSettings>(saved)
  const set = <K extends keyof CsatSettings>(key: K, value: CsatSettings[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = (Object.keys(draft) as (keyof CsatSettings)[]).some((k) => draft[k] !== saved[k])
  return { settings: draft, saved, set, dirty, save: () => { setSaved(draft); saveCsat(draft) }, discard: () => setDraft(saved) }
}

export type CsatSettingsApi = ReturnType<typeof useCsatSettings>
