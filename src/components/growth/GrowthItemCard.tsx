import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { GrowthItem } from '../../types'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-stage-rejected',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
}

interface Props {
  item: GrowthItem
  relatedLabel: string
  onToggleDone: () => void
  onSaveNotes: (notes: string) => Promise<void>
  onAskAdvice: () => Promise<void>
  advising: boolean
}

export function GrowthItemCard({
  item,
  relatedLabel,
  onToggleDone,
  onSaveNotes,
  onAskAdvice,
  advising,
}: Props) {
  const [notes, setNotes] = useState(item.notes ?? '')

  const saveNotes = async () => {
    if (notes !== (item.notes ?? '')) await onSaveNotes(notes)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <Checkbox checked={item.done} onCheckedChange={onToggleDone} className="mt-0.5" />
        <div className={item.done ? 'min-w-0 flex-1 opacity-50' : 'min-w-0 flex-1'}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{item.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${PRIORITY_STYLES[item.priority]}`}
            >
              {item.priority}
            </span>
            {item.source === 'ai' && (
              <span className="flex items-center gap-1 rounded-full bg-cobalt-soft px-2 py-0.5 font-mono text-[10px] uppercase text-cobalt">
                <Sparkles size={10} />
                AI
              </span>
            )}
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={2}
            placeholder="Write your own answer — what you know, what you're doing about it…"
            className="mt-2 text-xs"
          />

          {item.suggestedActions && item.suggestedActions.length > 0 && (
            <div className="mt-2 rounded-md bg-cobalt-soft/40 p-2">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-cobalt">
                <Sparkles size={10} />
                AI advice
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                {item.suggestedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onAskAdvice}
              disabled={advising}
              className="h-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-500 hover:bg-cobalt-soft hover:text-cobalt"
            >
              {advising
                ? 'Thinking…'
                : item.suggestedActions?.length
                  ? 'Refresh AI advice'
                  : 'Ask AI for advice'}
            </Button>
            {relatedLabel && (
              <span className="font-mono text-[10px] text-slate-400">from: {relatedLabel}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
