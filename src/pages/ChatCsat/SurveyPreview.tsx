import { useState } from 'react'
import type { CSSProperties } from 'react'
import { COMMENT_MAX, DEFAULT_CSAT, commentPromptShown, npsQuestionShown, reasonsFor } from './settings'
import type { CsatSettings } from './settings'

/** What the preview shows at the end of the chat. */
export type PreviewCase = 'ask' | 'recent'

type Props = { settings: CsatSettings; previewCase: PreviewCase; resetKey: number }

/**
 * The visitor's widget at the moment the chat ends, drawn from the draft settings. The survey can be answered here,
 * so the admin can try the visitor's side end to end.
 */
export function SurveyPreview({ settings: s, previewCase, resetKey }: Props) {
  const style = { '--widget-color': 'var(--primarySurfaceDefault)' } as CSSProperties
  const showSurvey = s.enabled && !(s.type === 'nps' && previewCase === 'recent')
  return (
    <div className="wp" style={style}>
      <div className="wp-widget" aria-label="Widget preview">
        <div className="wp-header">
          <img src="/widget/logo.svg" width={36} height={36} alt="" />
          <div className="wp-header__titles">
            <span className="wp-header__title">Support Team</span>
            <span className="wp-header__tagline">Support Team - AI Agent</span>
          </div>
          <span className="wp-header__online" />
        </div>
        <div className="wp-chat">
          <div className="wp-chat__thread">
            <div className="wp-msg wp-msg--agent">
              <div className="wp-msg__body">
                <span className="wp-bubble wp-bubble--agent">Did that fix the meter readings?</span>
                <span className="wp-time">AI Agent · 10:04 AM</span>
              </div>
            </div>
            <div className="wp-msg wp-msg--visitor">
              <span className="wp-bubble wp-bubble--visitor">Yes</span>
              <span className="wp-time">Just now</span>
            </div>
            <div className="wp-msg wp-msg--agent">
              <div className="wp-msg__body">
                <span className="wp-bubble wp-bubble--agent">Glad I could help!</span>
                <span className="wp-time">AI Agent · Just now</span>
              </div>
            </div>
            <div className="wp-chat__system">Conversation closed</div>
            {showSurvey && (s.type === 'nps'
              ? <NpsSurvey key={`nps-${resetKey}-${s.npsComment}-${s.npsReasons}`} settings={s} />
              : <RatingSurvey key={`rating-${resetKey}-${s.ratingStyle}`} settings={s} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Shows the admin's text, or the default while a field is empty. */
const shown = (s: CsatSettings, k: keyof CsatSettings) => (String(s[k]).trim() || String(DEFAULT_CSAT[k]))

/** Conversation rating: three answers as faces or text, in the admin's order, then a feedback box. */
function RatingSurvey({ settings: s }: { settings: CsatSettings }) {
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
      {s.ratingStyle === 'emoji' ? (
        <div className="cs-faces" role="radiogroup" aria-labelledby="cs-rating-q">
          {answers.map((r) => (
            <button key={r.value} type="button" role="radio" aria-checked={pick === r.value} aria-label={r.label} title={r.label} className={`cs-face${pick === r.value ? ' cs-face--on' : ''}`} onClick={() => setPick(r.value)}>
              <span className="cs-face__emoji cs-face__emoji--big" aria-hidden>{r.emoji}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="cs-text-answers" role="radiogroup" aria-labelledby="cs-rating-q">
          {answers.map((r) => (
            <button key={r.value} type="button" role="radio" aria-checked={pick === r.value} className={`cs-text-answer${pick === r.value ? ' cs-text-answer--on' : ''}`} onClick={() => setPick(r.value)}>{r.label}</button>
          ))}
        </div>
      )}
      <textarea className="cs-comment" rows={3} placeholder={s.ratingPlaceholder} aria-label="Feedback" />
      <button type="button" className="cs-submit" disabled={!pick} onClick={() => setDone(true)}>{shown(s, 'ratingButton')}</button>
    </div>
  )
}

/**
 * The NPS question (spec §7, Visitor). Picking a number saves it straight away and can be changed. Then, when on: reasons
 * to tap (what to improve for 0–8, what they liked for 9–10) and a comment box whose prompt can depend on the score.
 * With both off, the thanks shows right after the score.
 */
function NpsSurvey({ settings: s }: { settings: CsatSettings }) {
  const [score, setScore] = useState<number | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const reasonList = score === null ? [] : reasonsFor(s, score)
  const showReasons = s.npsReasons && reasonList.length > 0
  const followUp = score !== null && (showReasons || s.npsComment)
  const thanks = submitted || (score !== null && !followUp)
  const pickScore = (n: number) => {
    // Reasons differ for 0–8 and 9–10, so picks are cleared when the score crosses that line.
    if (score !== null && (score >= 9) !== (n >= 9)) setReasons([])
    setScore(n)
  }
  const toggle = (r: string) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  return (
    <div className="cs-card">
      <p className="cs-card__question" id="cs-nps-q">{npsQuestionShown(s)}</p>
      {!submitted && (
        <div className="cs-nps">
          <div className="cs-nps__scale" role="radiogroup" aria-labelledby="cs-nps-q">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n} type="button" role="radio" aria-checked={score === n} aria-label={`${n} out of 10`}
                className={`cs-nps__btn${score === n ? ' cs-nps__btn--on' : ''}`} onClick={() => pickScore(n)}
              >{n}</button>
            ))}
          </div>
          <div className="cs-nps__ends" aria-hidden><span>{s.npsLowLabel}</span><span>{s.npsHighLabel}</span></div>
        </div>
      )}
      {followUp && !submitted && (
        <>
          {showReasons && (
            <div className="cs-reasons" role="group" aria-label={score! >= 9 ? 'What went well' : 'What could be better'}>
              <span className="cs-comment-label">{score! >= 9 ? 'What went well?' : 'What could be better?'}</span>
              <div className="cs-reasons__list">
                {reasonList.map((r) => (
                  <button key={r} type="button" aria-pressed={reasons.includes(r)} className={`cs-reason${reasons.includes(r) ? ' cs-reason--on' : ''}`} onClick={() => toggle(r)}>{r}</button>
                ))}
              </div>
            </div>
          )}
          {s.npsComment && (
            <>
              <label className="cs-comment-label" htmlFor="cs-nps-comment">{commentPromptShown(s, score)}</label>
              <textarea
                id="cs-nps-comment" className="cs-comment" rows={3} maxLength={COMMENT_MAX} placeholder={s.npsPlaceholder}
                value={comment} onChange={(e) => setComment(e.target.value)}
              />
              <span className="cs-count">{comment.length}/{COMMENT_MAX}</span>
            </>
          )}
          <button type="button" className="cs-submit cs-submit--on" onClick={() => setSubmitted(true)}>{shown(s, 'npsButton')}</button>
        </>
      )}
      {thanks && <p className="cs-thanks">{shown(s, 'npsThanks')}</p>}
    </div>
  )
}
