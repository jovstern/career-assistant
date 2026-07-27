import type { Application } from '../../types'
import { STAGES, STAGE_LABELS } from '../../types'

export function PipelineRail({ applications }: { applications: Application[] }) {
  const total = applications.length
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        {STAGES.map((stage) => {
          const count = applications.filter((a) => a.stage === stage).length
          if (!count) return null
          return (
            <div
              key={stage}
              title={`${STAGE_LABELS[stage]}: ${count}`}
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: `var(--color-stage-${stage})`,
              }}
            />
          )
        })}
      </div>
      <span className="font-mono text-[11px] text-slate-400">
        {total} application{total === 1 ? '' : 's'}
      </span>
    </div>
  )
}
