import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web/build/player/lottie_light'
import type { CSSProperties } from 'react'
import { COMMENT_MAX, DEFAULT_CSAT } from './settings'
import type { CsatSettings } from './settings'
import { Icon } from '../../icons/Icon'
import { DEFAULT_START_LABEL } from '../WidgetDesign/widgetSettings'

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
          {s.enabled && <Survey settings={s} />}
        </div>
      </div>
      <div className="wp-launcher-row"><span className="wp-launcher cs-launcher" aria-label="Close chat"><Icon name="close" size={16} style={{ width: 20, height: 20 }} /></span></div>
    </div>
  )
}

/** `onDone` runs when the visitor submits; `onRestart` when they start a new conversation from the thank-you screen. */
type SurveyProps = { settings: CsatSettings; onDone?: () => void; onRestart?: () => void }

/**
 * After Submit the card keeps its size and colour: the tick animation plays once with the thank-you message under it,
 * centred, and Start Conversation sits under the card.
 */
/** The Start Conversation button (32px) and the 20px gap above it. */
const CTA_SPACE = 52

function SurveyThanks({ text, height, onRestart }: { text: string; height?: number; onRestart: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const anim = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: false, autoplay: true, path: `/tick.json?v=${Date.now()}` })
    return () => anim.destroy()
  }, [])
  return (
    <>
      {/* The card plus the button below it take the survey card's old height, so the widget doesn't jump. */}
      <div className="cs-card cs-done" style={height ? { minHeight: height - CTA_SPACE } : undefined}>
        <div className="cs-done__body" role="status">
          <div className="cs-done__tick" ref={ref} aria-hidden />
          <p className="cs-thanks">{text}</p>
        </div>
      </div>
      <button type="button" className="cs-submit cs-submit--full" onClick={onRestart}>{DEFAULT_START_LABEL}</button>
    </>
  )
}

/** The survey the saved settings ask for: the 0–10 scale for NPS, the three faces otherwise. */
export function Survey(props: SurveyProps) {
  return props.settings.type === 'nps' ? <NpsSurvey {...props} /> : <RatingSurvey {...props} />
}

/** Shows the admin's text, or the default while a field is empty. */
const shown = (s: CsatSettings, k: keyof CsatSettings) => (String(s[k]).trim() || String(DEFAULT_CSAT[k]))

/** Conversation rating: three faces with their labels, in the admin's order, then a comment box and the button. */
export function RatingSurvey({ settings: s, onDone, onRestart }: SurveyProps) {
  const [pick, setPick] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  const answers = [
    { value: 'good', emoji: '😀', label: shown(s, 'ratingGood') },
    { value: 'okay', emoji: '😐', label: shown(s, 'ratingOkay') },
    { value: 'bad', emoji: '🙁', label: shown(s, 'ratingBad') },
  ]
  if (s.ratingOrder === 'bad-first') answers.reverse()
  if (done) return <SurveyThanks text={shown(s, 'ratingThanks')} height={height} onRestart={() => { setDone(false); setPick(null); onRestart?.() }} />
  return (
    <div className="cs-card" ref={card}>
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
      <button type="button" className="cs-submit cs-submit--full" disabled={!pick} onClick={() => { setHeight(card.current?.offsetHeight); setDone(true); onDone?.() }}>{shown(s, 'ratingButton')}</button>
    </div>
  )
}

/** NPS: a joined 0–10 scale in the admin's order with the end labels under it, then a comment box and the button. */
export function NpsSurvey({ settings: s, onDone, onRestart }: SurveyProps) {
  const [score, setScore] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  const scores = Array.from({ length: 11 }, (_, n) => n)
  const ends = [s.npsLowLabel, s.npsHighLabel]
  if (s.npsOrder === 'good-first') { scores.reverse(); ends.reverse() }
  if (done) return <SurveyThanks text={shown(s, 'npsThanks')} height={height} onRestart={() => { setDone(false); setScore(null); onRestart?.() }} />
  return (
    <div className="cs-card" ref={card}>
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
      <button type="button" className="cs-submit cs-submit--full" disabled={score === null} onClick={() => { setHeight(card.current?.offsetHeight); setDone(true); onDone?.() }}>{shown(s, 'npsButton')}</button>
    </div>
  )
}
