import { Icon } from '../../icons/Icon'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Radio, RadioGroup } from '../../components/Radio'
import { PageBar } from '../SharedInboxes/SharedInboxesPage'
import { Switch } from '../../components/Switch'
import { DEFAULT_CSAT, LIMITS, hasErrors, useCsatSettings } from './settings'
import type { AnswerOrder, CsatSettings, CsatSettingsApi, SurveyType } from './settings'
import { SurveyPreview } from './SurveyPreview'
import '../WidgetDesign/WidgetDesignPage.css'
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
  const isNps = s.enabled && s.type === 'nps'

  return (
    <div className="hot-wd">
      <PageBar
        title="Customer Satisfaction Survey"
        action={<Switch checked={s.enabled} onChange={(e) => api.set('enabled', e.target.checked)} aria-label="Customer Satisfaction Survey" />}
      />
      <div className="hot-wd__body">
          <div className="hot-wd__form cs-form">
            {s.enabled ? (
              <>
                <section className="cs-group" aria-labelledby="cs-type-title">
                  <h2 className="cs-title" id="cs-type-title">Select the survey type</h2>
                  <SurveyTypeField api={api} />
                </section>
                <hr className="cs-divider" />
                <section className="cs-group" aria-labelledby="cs-details-title">
                  <h2 className="cs-title" id="cs-details-title">Survey details</h2>
                  {isNps ? <NpsFields api={api} /> : <RatingFields api={api} />}
                </section>
                {api.saved.type !== s.type && (
                  <div className="wd-note"><Icon name="info" size={14} />
                    <span>Applies to chats that end after you save.</span>
                  </div>
                )}
              </>
            ) : (
              <p className="wd-hint wd-hint--body">The survey is off. Visitors aren’t asked anything when a chat ends.</p>
            )}
          </div>

          <div className="hot-wd-preview cs-preview">
            <SurveyPreview settings={s} />
          </div>
      </div>

      <div className="hot-wd__actions">
        <Button variant="primary" size="sm" disabled={!api.dirty || hasErrors(s)} onClick={api.save}>Save</Button>
      </div>
    </div>
  )
}

/** One question per widget, never both (spec §6). */
function SurveyTypeField({ api }: { api: CsatSettingsApi }) {
  return (
    <RadioGroup name="cs-type" value={api.settings.type} onChange={(v) => api.set('type', v as SurveyType)}>
      <Radio value="rating" label={<span className="cs-option"><span className="cs-option__title">Conversation rating</span><span className="cs-option__desc">CSAT survey is added by default in all replies.</span></span>} />
      <Radio value="nps" label={<span className="cs-option"><span className="cs-option__title">NPS (Net Promoter Score)</span><span className="cs-option__desc">Visitors rate how likely they are to recommend you, from 0 to 10.</span></span>} />
    </RadioGroup>
  )
}

/** NPS (Figma: Chat NPS CSAT > NPS): headline, scale order, end labels, placeholder, button and thanks. */
function NpsFields({ api }: { api: CsatSettingsApi }) {
  const s = api.settings
  return (
    <div className="cs-fields">
      <TextField api={api} k="npsQuestion" label="Headline" max={LIMITS.npsQuestion} required count={false} />
      <RadioGroup label="Rating order" required name="cs-nps-order" value={s.npsOrder} onChange={(v) => api.set('npsOrder', v as AnswerOrder)}>
        <Radio value="bad-first" label="Bad to Good" />
        <Radio value="good-first" label="Good to Bad" />
      </RadioGroup>
      <TextField api={api} k="npsLowLabel" label="Low score label" max={LIMITS.answer} required count={false} />
      <TextField api={api} k="npsHighLabel" label="High score label" max={LIMITS.answer} required count={false} />
      <TextField api={api} k="npsPlaceholder" label="Description placeholder text" max={LIMITS.placeholder} count={false} />
      <TextField api={api} k="npsButton" label="Button text" max={LIMITS.button} required count={false} />
      <TextField api={api} k="npsThanks" label="Thank you message" max={LIMITS.thanks} required count={false} />
    </div>
  )
}

type TextKey = Exclude<{ [K in keyof CsatSettings]: CsatSettings[K] extends string ? K : never }[keyof CsatSettings], 'type' | 'ratingOrder' | 'npsOrder'>

/** A text input for visitor-facing copy, with a character count and an empty-field error when required. */
function TextField({ api, k, label, max, required, helper, count = true }: { api: CsatSettingsApi; k: TextKey; label: string; max: number; required?: boolean; helper?: string; count?: boolean }) {
  const value = api.settings[k]
  const empty = required && !value.trim()
  return (
    <div className="wd-field wd-field--stretch">
      <Input
        label={required ? <>{label} <span className="cs-req">*</span></> : label} value={value} maxLength={max} suffix={count ? { count: true } : undefined} fullWidth
        placeholder={DEFAULT_CSAT[k]} error={empty} helperText={empty ? `${label} can’t be empty.` : helper}
        onChange={(e) => api.set(k, e.target.value)}
      />
    </div>
  )
}

/** Conversation rating (Figma: Chat NPS CSAT > Conversation): headline, rating order, placeholder, button and thanks. */
function RatingFields({ api }: { api: CsatSettingsApi }) {
  const s = api.settings
  return (
    <div className="cs-fields">
      <TextField api={api} k="ratingQuestion" label="Headline" max={LIMITS.question} required count={false} />
      <RadioGroup label="Rating order" required name="cs-order" value={s.ratingOrder} onChange={(v) => api.set('ratingOrder', v as AnswerOrder)}>
        <Radio value="bad-first" label="Bad to Good" />
        <Radio value="good-first" label="Good to Bad" />
      </RadioGroup>
      <TextField api={api} k="ratingPlaceholder" label="Description placeholder text" max={LIMITS.placeholder} count={false} />
      <TextField api={api} k="ratingButton" label="Button text" max={LIMITS.button} required count={false} />
      <TextField api={api} k="ratingThanks" label="Thank you message" max={LIMITS.thanks} required count={false} />
    </div>
  )
}
