import { useDroppable } from '@dnd-kit/core'
import type { Application, Stage } from '../../types'
import { STAGE_LABELS } from '../../types'
import { ApplicationCard } from './ApplicationCard'

interface Props {
  stage: Stage
  applications: Application[]
  onCardClick: (app: Application) => void
}

export function Column({ stage, applications, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(--color-stage-${stage})` }}
          />
          {STAGE_LABELS[stage]}
        </span>
        <span className="font-mono text-[11px] text-slate-400">{applications.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-lg p-2 transition-colors ${
          isOver ? 'bg-cobalt-soft' : 'bg-slate-100/70'
        }`}
      >
        {applications.map((app) => (
          <ApplicationCard key={app.id} application={app} onClick={() => onCardClick(app)} />
        ))}
        {applications.length === 0 && (
          <p className="mt-4 text-center font-mono text-[11px] text-slate-400">drop here</p>
        )}
      </div>
    </div>
  )
}
