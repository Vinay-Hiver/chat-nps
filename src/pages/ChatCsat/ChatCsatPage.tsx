import { useRef, useState } from 'react'
import { Icon } from '../../icons/Icon'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { Input } from '../../components/Input'
import { Popover } from '../../components/Popover'
import { Radio, RadioGroup } from '../../components/Radio'
import { Tabs } from '../../components/Tabs'
import { PageBar } from '../SharedInboxes/SharedInboxesPage'
import { ToggleRow } from '../WidgetDesignOptions/fields'
import { DEFAULT_CSAT, LIMITS, NPS_PERIODS, hasErrors, useCsatSettings } from './settings'
import type { AnswerOrder, AnswerStyle, CsatSettings, CsatSettingsApi, NpsPeriod, SurveyType } from './settings'
import { SurveyPreview } from './SurveyPreview'
import type { PreviewCase } from './SurveyPreview'
import '../WidgetDesignOptions/WidgetDesignOptionsPage.css'
import './ChatCsatPage.css'

/**
 * Admin panel > Shared Inbox > a chat inbox > CSAT. The end-of-chat question for this widget: today's rating or NPS
 * (Product Spec: NPS style chat CSAT). Settings open up step by step: the survey switch, then the question type,
 * then the NPS options only when NPS is picked.
 */
export function ChatCsatPage() {
  const api = useCsatSettings()
  const s = api.settings
  const [previewCase, setPreviewCase] = useState<PreviewCase>('ask')
  const [resetKey, setResetKey] = useState(0)
  const isNps = s.enabled && s.type === 'nps'

  return (
    <div className="wd-page">
      <PageBar title="CSAT" />
      <div className="wd-body">
        <div className="wd-split">
          <div className="wd-form">
            <ToggleRow
              title="Survey after chat ends"
              checked={s.enabled} onChange={(v) => api.set('enabled', v)}
            >
              <SurveyTypeField api={api} />
            </ToggleRow>
            {s.enabled && s.type === 'rating' && <RatingFields api={api} />}
            {isNps && <NpsFields api={api} />}
            {s.enabled && api.saved.type !== s.type && (
              <div className="wd-note"><Icon name="info" size={14} />
                <span>Applies to chats that end after you save.</span>
              </div>
            )}
          </div>

          <div className="wd-preview">
            <div className="wd-preview__top">
              {isNps && (
                <Tabs
                  tabs={[{ value: 'ask', label: 'Not asked yet' }, { value: 'recent', label: `Asked in last ${s.npsPeriod} days` }]}
                  value={previewCase} onChange={(v) => setPreviewCase(v as PreviewCase)} variant="filled" aria-label="Preview case"
                />
              )}
              {isNps && previewCase === 'recent' && <span className="wd-hint">Survey not shown</span>}
              {s.enabled && <Button variant="ghost" size="xs" iconLeft={<Icon name="refresh" size={16} />} onClick={() => setResetKey((k) => k + 1)}>Restart preview</Button>}
            </div>
            <SurveyPreview settings={s} previewCase={isNps ? previewCase : 'ask'} resetKey={resetKey} />
          </div>
        </div>
      </div>

      <div className={`wd-savebar${api.dirty ? ' wd-savebar--dirty' : ''}`}>
        <span className="wd-savebar__status">{hasErrors(s) ? 'Fill in required fields' : api.dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <div className="wd-savebar__actions">
          {api.dirty && <Button variant="ghost" size="sm" onClick={api.discard}>Discard</Button>}
          <Button variant="primary" size="sm" disabled={!api.dirty || hasErrors(s)} onClick={api.save}>Save</Button>
        </div>
      </div>
    </div>
  )
}

/** One question per widget, never both (spec §6). */
function SurveyTypeField({ api }: { api: CsatSettingsApi }) {
  return (
    <RadioGroup label="Survey type" name="cs-type" value={api.settings.type} onChange={(v) => api.set('type', v as SurveyType)}>
      <Radio value="rating" label={<span className="cs-option"><span className="cs-option__title">Conversation rating</span><span className="cs-option__desc">Visitors rate this chat as Satisfied, Okay or Not satisfied.</span></span>} />
      <Radio value="nps" label={<span className="cs-option"><span className="cs-option__title">NPS (Net Promoter Score)</span><span className="cs-option__desc">Visitors rate how likely they are to recommend you, from 0 to 10.</span></span>} />
    </RadioGroup>
  )
}

/** The NPS options (spec §7, Admin): question, comment prompt, how often a contact is asked. */
function NpsFields({ api }: { api: CsatSettingsApi }) {
  const s = api.settings
  const periodRef = useRef<HTMLSpanElement>(null)
  const [periodOpen, setPeriodOpen] = useState(false)
  return (
    <section className="cs-section" aria-label="NPS question">
      <TextField api={api} k="npsQuestion" label="Question" max={LIMITS.npsQuestion} required />

      <div className="cs-pair">
        <TextField api={api} k="npsLowLabel" label="Label for 0" max={LIMITS.answer} />
        <TextField api={api} k="npsHighLabel" label="Label for 10" max={LIMITS.answer} />
      </div>

      <ToggleRow
        title="Ask for a comment"
        checked={s.npsComment} onChange={(v) => api.set('npsComment', v)}
      >
        <RadioGroup label="Comment prompt" name="cs-prompt" value={s.npsPromptByScore ? 'score' : 'same'} onChange={(v) => api.set('npsPromptByScore', v === 'score')}>
          <Radio value="score" label="Depends on the score" />
          <Radio value="same" label="Same for every score" />
        </RadioGroup>
        {s.npsPromptByScore ? (
          <div className="cs-nested">
            <TextField api={api} k="npsPromptDetractor" label="Scores 0–6" max={LIMITS.prompt} />
            <TextField api={api} k="npsPromptPassive" label="Scores 7–8" max={LIMITS.prompt} />
            <TextField api={api} k="npsPromptPromoter" label="Scores 9–10" max={LIMITS.prompt} />
          </div>
        ) : (
          <div className="cs-nested">
            <TextField api={api} k="npsCommentPrompt" label="Prompt" max={LIMITS.prompt} />
          </div>
        )}
        <TextField api={api} k="npsPlaceholder" label="Placeholder" max={LIMITS.placeholder} />
      </ToggleRow>

      <TextField api={api} k="npsButton" label="Button text" max={LIMITS.button} required />

      <div className="wd-field">
        <span className="wd-label" id="cs-period-label">Ask a contact once every</span>
        <span ref={periodRef} className="cs-anchor"><Button
          variant="secondary" size="sm" aria-labelledby="cs-period-label" aria-haspopup="listbox" aria-expanded={periodOpen}
          iconRight={<Icon name={periodOpen ? 'chevrontop' : 'chevrondown'} size={16} />} onClick={() => setPeriodOpen((o) => !o)}
        >{s.npsPeriod} days</Button></span>
        <Popover open={periodOpen} onClose={() => setPeriodOpen(false)} anchorRef={periodRef}>
          <Dropdown
            variant="radio" value={String(s.npsPeriod)}
            options={NPS_PERIODS.map((d) => ({ value: String(d), label: `${d} days${d === 90 ? ' (recommended)' : ''}` }))}
            onChange={(v: string | string[]) => { api.set('npsPeriod', Number(Array.isArray(v) ? v[0] : v) as NpsPeriod); setPeriodOpen(false) }}
          />
        </Popover>
        <span className="wd-hint">So the same contact isn’t asked after every chat.</span>
      </div>

    </section>
  )
}

type TextKey = Exclude<{ [K in keyof CsatSettings]: CsatSettings[K] extends string ? K : never }[keyof CsatSettings], 'type' | 'ratingStyle' | 'ratingOrder'>

/** A text input for visitor-facing copy, with a character count and an empty-field error when required. */
function TextField({ api, k, label, max, required, helper }: { api: CsatSettingsApi; k: TextKey; label: string; max: number; required?: boolean; helper?: string }) {
  const value = api.settings[k]
  const empty = required && !value.trim()
  return (
    <div className="wd-field wd-field--stretch">
      <Input
        label={required ? <>{label} <span className="cs-req">*</span></> : label} value={value} maxLength={max} suffix={{ count: true }} fullWidth
        placeholder={DEFAULT_CSAT[k]} error={empty} helperText={empty ? `${label} can’t be empty.` : helper}
        onChange={(e) => api.set(k, e.target.value)}
      />
    </div>
  )
}

/** Conversation rating text: question, answer style and order, comment placeholder, button and thanks. */
function RatingFields({ api }: { api: CsatSettingsApi }) {
  const s = api.settings
  const answers: { k: TextKey; label: string }[] = [
    { k: 'ratingGood', label: 'Best answer' }, { k: 'ratingOkay', label: 'Middle answer' }, { k: 'ratingBad', label: 'Worst answer' },
  ]
  if (s.ratingOrder === 'bad-first') answers.reverse()
  return (
    <section className="cs-section" aria-label="Conversation rating">
      <TextField api={api} k="ratingQuestion" label="Question" max={LIMITS.question} required />

      <RadioGroup label="Answer style" name="cs-style" value={s.ratingStyle} onChange={(v) => api.set('ratingStyle', v as AnswerStyle)}>
        <Radio value="emoji" label="Emoji" />
        <Radio value="text" label="Text" />
      </RadioGroup>
      {s.ratingStyle === 'text' && (
        <div className="cs-nested">
          {answers.map((a) => <TextField key={a.k} api={api} k={a.k} label={a.label} max={LIMITS.answer} required />)}
        </div>
      )}

      <RadioGroup label="Answer order" name="cs-order" value={s.ratingOrder} onChange={(v) => api.set('ratingOrder', v as AnswerOrder)}>
        <Radio value="good-first" label="Good to bad" />
        <Radio value="bad-first" label="Bad to good" />
      </RadioGroup>

      <TextField api={api} k="ratingPlaceholder" label="Placeholder" max={LIMITS.placeholder} />
      <TextField api={api} k="ratingButton" label="Button text" max={LIMITS.button} required />
      <TextField api={api} k="ratingThanks" label="Thank you message" max={LIMITS.thanks} required />
    </section>
  )
}
