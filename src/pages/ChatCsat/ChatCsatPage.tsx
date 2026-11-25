import { useRef, useState } from 'react'
import { Icon } from '../../icons/Icon'
import { Dropdown } from '../../components/Dropdown'
import { Popover } from '../../components/Popover'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Radio, RadioGroup } from '../../components/Radio'
import { PageBar } from '../SharedInboxes/SharedInboxesPage'
import { Switch } from '../../components/Switch'
import { DEFAULT_CSAT, LIMITS, NPS_PERIODS, NPS_PERIOD_MAX, hasErrors, useCsatSettings } from './settings'
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
      <PeriodField api={api} />
    </div>
  )
}

/**
 * How often the same contact can be asked (PRD §7: 30, 60, 90 or 180 days, default 90), or a custom number of days:
 * picking Custom shows a number field, and 10 there means 10 days.
 */
function PeriodField({ api }: { api: CsatSettingsApi }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const days = api.settings.npsPeriod
  const [custom, setCustom] = useState(!NPS_PERIODS.includes(days))
  const [draft, setDraft] = useState(String(days))
  const n = Number(draft)
  const valid = /^\d+$/.test(draft.trim()) && n >= 1 && n <= NPS_PERIOD_MAX
  return (
    <div className="wd-field cs-period">
      {/* The whole field opens the list, not just the text: the chevron and padding sit outside the input. */}
      <div ref={ref} className="cs-select-wrap cs-select-wrap--click" onClick={(e) => { if ((e.target as HTMLElement).closest('.hot-field__box')) setOpen((o) => !o) }}><Input
        label="Don’t ask the same contact again for" value={custom ? 'Custom period' : `${days} days`} readOnly
        suffix={<Icon name={open ? 'chevrontop' : 'chevrondown'} size={16} />}
        aria-haspopup="listbox" aria-expanded={open} className="cs-select"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) } }}
      /></div>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref}>
        <Dropdown
          variant="radio" value={custom ? 'custom' : String(days)}
          options={[
            ...NPS_PERIODS.map((d) => ({ value: String(d), label: `${d} days${d === 90 ? ' (recommended)' : ''}` })),
            { value: 'custom', label: 'Custom period' },
          ]}
          onChange={(v: string | string[]) => {
            const value = Array.isArray(v) ? v[0] : v
            if (value === 'custom') { setCustom(true); setDraft(String(days)) } else { setCustom(false); api.set('npsPeriod', Number(value)) }
            setOpen(false)
          }}
        />
      </Popover>
      {custom && (
        <div className="cs-select-wrap cs-period-custom">
          <Input
            aria-label="Number of days" inputMode="numeric" value={draft} suffix="days" autoFocus
            error={!valid} helperText={valid ? undefined : `Enter a whole number from 1 to ${NPS_PERIOD_MAX}`}
            onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setDraft(v); const k = Number(v); if (k >= 1 && k <= NPS_PERIOD_MAX) api.set('npsPeriod', k) }}
          />
        </div>
      )}
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
