import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { InterviewStep } from '../../types'

const SUGGESTIONS = ['Phone screen', 'Take-home assignment', 'Technical interview', 'On-site', 'HR / offer talk']

interface Props {
  steps: InterviewStep[]
  onChange: (steps: InterviewStep[]) => void
}

export function InterviewSteps({ steps, onChange }: Props) {
  const [newLabel, setNewLabel] = useState('')
  // Labels are edited locally and committed on blur — one Firestore write per
  // edit instead of one per keystroke. Checkbox/add/delete commit immediately.
  const [local, setLocal] = useState(steps)

  useEffect(() => setLocal(steps), [steps])

  const commit = (next: InterviewStep[]) => {
    setLocal(next)
    onChange(next)
  }

  const add = (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    commit([...local, { id: crypto.randomUUID(), label: trimmed, done: false }])
    setNewLabel('')
  }

  const patchLabel = (id: string, label: string) =>
    setLocal(local.map((s) => (s.id === id ? { ...s, label } : s)))

  const toggle = (id: string) =>
    commit(local.map((s) => (s.id === id ? { ...s, done: !s.done } : s)))

  const remove = (id: string) => commit(local.filter((s) => s.id !== id))

  const commitLabels = () => {
    const cleaned = local.filter((s) => s.label.trim())
    if (JSON.stringify(cleaned) !== JSON.stringify(steps)) onChange(cleaned)
  }

  const done = local.filter((s) => s.done).length

  return (
    <div className="mt-1 rounded-lg border border-slate-200 p-3">
      {local.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="bg-stage-interviewing transition-all"
              style={{ width: `${(done / local.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {done}/{local.length}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {local.map((step) => (
          <li key={step.id} className="group flex items-center gap-2">
            <input
              type="checkbox"
              checked={step.done}
              onChange={() => toggle(step.id)}
              className="accent-cobalt"
            />
            <input
              value={step.label}
              onChange={(e) => patchLabel(step.id, e.target.value)}
              onBlur={commitLabels}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-cobalt focus:bg-white focus:outline-none ${
                step.done ? 'text-slate-400 line-through' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => remove(step.id)}
              className="text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              title="Remove step"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(newLabel)
            }
          }}
          placeholder="Add a step… e.g. Phone screen"
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-cobalt focus:outline-none"
        />
        <button
          type="button"
          onClick={() => add(newLabel)}
          className="shrink-0 rounded-md border border-cobalt p-1.5 text-cobalt hover:bg-cobalt-soft"
          title="Add step"
        >
          <Plus size={14} />
        </button>
      </div>

      {local.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 hover:bg-cobalt-soft hover:text-cobalt"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
