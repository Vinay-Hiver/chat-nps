import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { Popover } from '../../components/Popover'
import { Tag } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { GROUP_COLOR, GROUP_LABEL, fmtNps, npsGroup, pct } from './data'
import type { Split } from './data'
import './nps.css'

/** A score with its group, for example "3 · Detractor". */
export function ScoreTag({ score, short }: { score: number; short?: boolean }) {
  const g = npsGroup(score)
  return <Tag color={GROUP_COLOR[g]}>{short ? score : `${score} · ${GROUP_LABEL[g]}`}</Tag>
}

/** An NPS value coloured by sign. */
export function NpsValue({ value }: { value: number | null }) {
  const cls = value === null ? '' : value < 0 ? ' nps-score--neg' : value > 0 ? ' nps-score--pos' : ''
  return <span className={`nps-score${cls}`}>{fmtNps(value)}</span>
}

/** Promoters, passives and detractors as one bar with a legend. */
export function SplitBar({ split }: { split: Split }) {
  const parts = (['promoter', 'passive', 'detractor'] as const).map((k) => ({ k, n: split[k], label: { promoter: 'Promoters', passive: 'Passives', detractor: 'Detractors' }[k] }))
  return (
    <div className="nps-split">
      <div className="nps-split__bar" role="img" aria-label={parts.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(', ')}>
        {parts.map((p) => p.n > 0 && <span key={p.k} className={`nps-fill--${p.k}`} style={{ width: `${pct(p.n, split.total)}%` }} />)}
      </div>
      <div className="nps-split__legend">
        {parts.map((p) => <span key={p.k}><span className={`nps-dot nps-fill--${p.k}`} />{p.label} {p.n} ({pct(p.n, split.total)}%)</span>)}
      </div>
    </div>
  )
}

/** A button that opens a radio list (Popover + Dropdown), for filters and pickers. */
export function SelectMenu({ label, icon, value, options, onChange }: { label: string; icon?: IconName; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <span ref={ref} className="nps-anchor">
        <Button variant="secondary" size="sm" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? ''}`}
          iconLeft={icon ? <Icon name={icon} size={16} /> : undefined} iconRight={<Icon name={open ? 'chevrontop' : 'chevrondown'} size={16} />}
          onClick={() => setOpen((o) => !o)}
        >{label}: {current?.label}</Button>
      </span>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref}>
        <Dropdown variant="radio" value={value} options={options} onChange={(v) => { onChange(Array.isArray(v) ? v[0] : v); setOpen(false) }} />
      </Popover>
    </>
  )
}

export type SortDir = 'asc' | 'desc' | null

/** A column header that sorts when pressed: off, lowest first, highest first. */
export function SortHeader({ label, dir, onChange }: { label: string; dir: SortDir; onChange: (d: SortDir) => void }) {
  const next: SortDir = dir === null ? 'asc' : dir === 'asc' ? 'desc' : null
  return (
    <button type="button" className="nps-sort" onClick={() => onChange(next)} aria-label={`Sort by ${label}`}>
      {label}{dir && <Icon name={dir === 'asc' ? 'chevrontop' : 'chevrondown'} size={14} />}
    </button>
  )
}
