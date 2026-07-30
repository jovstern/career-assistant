import type { SkillGap } from '../../types'
import { Checkbox } from '../ui/Checkbox'

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-stage-rejected',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
}

interface Props {
  skillGap: SkillGap
  onToggle: (index: number) => void
}

export function SkillGapPanel({ skillGap, onToggle }: Props) {
  const done = skillGap.items.filter((i) => i.done).length
  return (
    <div className="mt-2 rounded-lg border border-slate-200 p-3">
      <p className="text-sm text-slate-600">{skillGap.summary}</p>
      <p className="mt-2 font-mono text-[11px] text-slate-400">
        {done}/{skillGap.items.length} closed
      </p>
      <ul className="mt-2 space-y-2">
        {skillGap.items.map((item, i) => (
          <li key={item.skill} className="flex items-start gap-2">
            <Checkbox checked={item.done} onCheckedChange={() => onToggle(i)} className="mt-0.5" />
            <div className={item.done ? 'opacity-50' : ''}>
              <span className="text-sm font-medium">{item.skill}</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${PRIORITY_STYLES[item.priority]}`}
              >
                {item.priority}
              </span>
              <p className="text-xs text-slate-500">{item.suggestion}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
