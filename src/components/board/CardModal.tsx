import { useState } from 'react'
import type { Application, Stage } from '../../types'
import { STAGES, STAGE_LABELS } from '../../types'

interface Props {
  application: Application
  onClose: () => void
  onUpdate: (data: Partial<Pick<Application, 'stage' | 'notes'>>) => Promise<void>
  onDelete: () => Promise<void>
}

export function CardModal({ application, onClose, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState(application.notes)

  const saveNotes = async () => {
    if (notes !== application.notes) await onUpdate({ notes })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">{application.jobTitle}</h2>
            <p className="text-sm text-slate-500">
              {application.company}
              {application.location ? ` · ${application.location}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-ink">
            ✕
          </button>
        </div>

        <div className="mt-4">
          <label className="font-mono text-[11px] uppercase text-slate-400">Stage</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {STAGES.map((stage: Stage) => (
              <button
                key={stage}
                onClick={() => onUpdate({ stage })}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  application.stage === stage
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                style={
                  application.stage === stage
                    ? { backgroundColor: `var(--color-stage-${stage})` }
                    : undefined
                }
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>

        {application.url && (
          <div className="mt-4">
            <label className="font-mono text-[11px] uppercase text-slate-400">Job link</label>
            <a
              href={application.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm text-cobalt hover:underline"
            >
              {application.url}
            </a>
          </div>
        )}

        {application.description && (
          <div className="mt-4">
            <label className="font-mono text-[11px] uppercase text-slate-400">Description</label>
            <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-sm text-slate-600">
              {application.description}
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="font-mono text-[11px] uppercase text-slate-400">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={4}
            placeholder="Recruiter contacts, interview dates, impressions…"
            className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm focus:border-cobalt focus:outline-none"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={async () => {
              await onDelete()
              onClose()
            }}
            className="text-xs text-red-500 hover:underline"
          >
            Delete application
          </button>
        </div>
      </div>
    </div>
  )
}
