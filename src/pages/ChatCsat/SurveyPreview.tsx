import { useState } from 'react'
import type { CSSProperties } from 'react'
import { COMMENT_MAX, DEFAULT_CSAT } from './settings'
import type { CsatSettings } from './settings'
import { Icon } from '../../icons/Icon'

type Props = { settings: CsatSettings }

/**
 * The visitor's widget at the moment the chat ends, drawn from the draft settings. The survey can be answered here,
 * so the admin can try the visitor's side end to end.
 */
export function SurveyPreview({ settings: s }: Props) {
  const style = { '--widget-color': 'var(--primarySurfaceDefault)' } as CSSProperties
  return (
    <div className="wp cs-wp" style={style}>
      <div className="wp-widget cs-widget" aria-label="Widget preview">
        {/* The chat itself is drawn as placeholder bars so the survey stands out. */}
        <div className="cs-skel-header" aria-hidden>
          <span className="cs-skel cs-skel--avatar" />
          <span className="cs-skel-lines"><span className="cs-skel" style={{ width: 150 }} /><span className="cs-skel" style={{ width: 120 }} /></span>
        </div>
        <div className="cs-skel-body" aria-hidden>
          <span className="cs-skel" /><span className="cs-skel" /><span className="cs-skel" style={{ width: '40%' }} />
        </div>
        <div className="cs-end">
          <div className="wp-chat__system cs-closed">Conversation closed</div>
          {s.enabled && (s.type === 'nps' ? <NpsSurvey settings={s} /> : <RatingSurvey settings={s} />)}
        </div>
      </div>
      <div className="wp-launcher-row"><span className="wp-launcher cs-launcher" aria-label="Open chat"><Icon name="chatsupport" size={24} /></span></div>
    </div>
  )
}

/** `onDone` runs when the visitor submits. */
type SurveyProps = { settings: CsatSettings; onDone?: () => void }

/** The survey the saved settings ask for: the 0–10 scale for NPS, the three faces otherwise. */
export function Survey(props: SurveyProps) {
  return props.settings.type === 'nps' ? <NpsSurvey {...props} /> : <RatingSurvey {...props} />
}

/** Shows the admin's text, or the default while a field is empty. */
const shown = (s: CsatSettings, k: keyof CsatSettings) => (String(s[k]).trim() || String(DEFAULT_CSAT[k]))

/** Conversation rating: three faces with their labels, in the admin's order, then a comment box and the button. */
export function RatingSurvey({ settings: s, onDone }: SurveyProps) {
  const [pick, setPick] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const answers = [
    { value: 'good', emoji: '😀', label: shown(s, 'ratingGood') },
    { value: 'okay', emoji: '😐', label: shown(s, 'ratingOkay') },
    { value: 'bad', emoji: '🙁', label: shown(s, 'ratingBad') },
  ]
  if (s.ratingOrder === 'bad-first') answers.reverse()
  if (done) return <div className="cs-card cs-card--thanks">{shown(s, 'ratingThanks')}</div>
  return (
    <div className="cs-card">
      <p className="cs-card__question" id="cs-rating-q">{shown(s, 'ratingQuestion')}</p>
      <div className="cs-faces" role="radiogroup" aria-labelledby="cs-rating-q">
        {answers.map((r) => (
          <button key={r.value} type="button" role="radio" aria-checked={pick === r.value} className={`cs-face${pick === r.value ? ' cs-face--on' : ''}`} onClick={() => setPick(r.value)}>
            <span className="cs-face__emoji" aria-hidden>{r.emoji}</span>
            <span className="cs-face__label">{r.label}</span>
          </button>
        ))}
      </div>
      <textarea className="cs-comment cs-comment--tall" placeholder={shown(s, 'ratingPlaceholder')} aria-label="Comments" />
      <button type="button" className="cs-submit cs-submit--full" disabled={!pick} onClick={() => { setDone(true); onDone?.() }}>{shown(s, 'ratingButton')}</button>
    </div>
  )
}

/** NPS: a joined 0–10 scale in the admin's order with the end labels under it, then a comment box and the button. */
export function NpsSurvey({ settings: s, onDone }: SurveyProps) {
  const [score, setScore] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const scores = Array.from({ length: 11 }, (_, n) => n)
  const ends = [s.npsLowLabel, s.npsHighLabel]
  if (s.npsOrder === 'good-first') { scores.reverse(); ends.reverse() }
  if (done) return <div className="cs-card cs-card--thanks">{shown(s, 'npsThanks')}</div>
  return (
    <div className="cs-card">
      <p className="cs-card__question" id="cs-nps-q">{shown(s, 'npsQuestion')}</p>
      <div className="cs-nps">
        <div className="cs-nps__scale" role="radiogroup" aria-labelledby="cs-nps-q">
          {scores.map((n) => (
            <button
              key={n} type="button" role="radio" aria-checked={score === n} aria-label={`${n} out of 10`}
              className={`cs-nps__btn${score === n ? ' cs-nps__btn--on' : ''}`} onClick={() => setScore(n)}
            >{n}</button>
          ))}
        </div>
        <div className="cs-nps__ends" aria-hidden><span>{ends[0]}</span><span>{ends[1]}</span></div>
      </div>
      <textarea className="cs-comment cs-comment--tall" maxLength={COMMENT_MAX} placeholder={shown(s, 'npsPlaceholder')} aria-label="Comments" />
      <button type="button" className="cs-submit cs-submit--full" disabled={score === null} onClick={() => { setDone(true); onDone?.() }}>{shown(s, 'npsButton')}</button>
    </div>
  )
}
