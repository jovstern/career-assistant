import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Application, Stage } from '../../types'
import { STAGES, STAGE_LABELS } from '../../types'
import { analyzeSkillGap, generateResume } from '../../lib/ai'
import { SkillGapPanel } from './SkillGapPanel'
import { InterviewSteps } from './InterviewSteps'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface Props {
  application: Application
  onClose: () => void
  onUpdate: (
    data: Partial<Pick<Application, 'stage' | 'notes' | 'skillGap' | 'interviewSteps'>>
  ) => Promise<void>
  onDelete: () => Promise<void>
}

export function CardModal({ application, onClose, onUpdate, onDelete }: Props) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(application.notes)
  const [aiBusy, setAiBusy] = useState<'resume' | 'gap' | null>(null)
  const [aiError, setAiError] = useState('')

  const runResume = async () => {
    setAiBusy('resume')
    setAiError('')
    try {
      const resumeId = await generateResume(application.id)
      navigate(`/resume/${resumeId}`)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Resume generation failed')
    } finally {
      setAiBusy(null)
    }
  }

  const runGap = async () => {
    setAiBusy('gap')
    setAiError('')
    try {
      await analyzeSkillGap(application.id)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Skill gap analysis failed')
    } finally {
      setAiBusy(null)
    }
  }

  const toggleGapItem = (index: number) => {
    if (!application.skillGap) return
    const items = application.skillGap.items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    )
    void onUpdate({ skillGap: { ...application.skillGap, items } })
  }

  const saveNotes = async () => {
    if (notes !== application.notes) await onUpdate({ notes })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="block max-h-[88vh] gap-0 overflow-y-auto bg-white p-6 text-ink sm:max-w-lg">
        <div>
          <DialogTitle className="font-display text-lg font-bold leading-snug">
            {application.jobTitle}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            {application.company}
            {application.location ? ` · ${application.location}` : ''}
          </p>
        </div>

      <div className="mt-4">
        <label className="font-mono text-[11px] uppercase text-slate-400">Stage</label>
        <ToggleGroup
          value={[application.stage]}
          onValueChange={(values) => {
            const stage = values[0] as Stage | undefined
            if (stage) void onUpdate({ stage })
          }}
          className="mt-1 flex w-full flex-wrap gap-1.5"
        >
          {STAGES.map((stage: Stage) => (
            <ToggleGroupItem
              key={stage}
              value={stage}
              className="h-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-normal text-slate-500 transition-colors hover:bg-slate-200 data-pressed:text-white"
              style={
                application.stage === stage
                  ? { backgroundColor: `var(--color-stage-${stage})` }
                  : undefined
              }
            >
              {STAGE_LABELS[stage]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {(application.stage === 'interviewing' || (application.interviewSteps?.length ?? 0) > 0) && (
          <div className="mt-4">
            <label className="font-mono text-[11px] uppercase text-slate-400">
              Interview steps
            </label>
            <InterviewSteps
              steps={application.interviewSteps ?? []}
              onChange={(interviewSteps) => void onUpdate({ interviewSteps })}
            />
          </div>
        )}

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

        <div className="mt-4">
          <label className="font-mono text-[11px] uppercase text-slate-400">AI tools</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              onClick={runResume}
              disabled={aiBusy !== null}
              className="rounded-md bg-cobalt px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {aiBusy === 'resume' ? 'Generating…' : application.resumeId ? 'Regenerate resume' : 'Generate resume'}
            </button>
            {application.resumeId && (
              <button
                onClick={() => navigate(`/resume/${application.resumeId}`)}
                className="rounded-md border border-cobalt px-3 py-1.5 text-xs font-medium text-cobalt hover:bg-cobalt-soft"
              >
                View resume
              </button>
            )}
            <button
              onClick={runGap}
              disabled={aiBusy !== null}
              className="rounded-md border border-cobalt px-3 py-1.5 text-xs font-medium text-cobalt hover:bg-cobalt-soft disabled:opacity-50"
            >
              {aiBusy === 'gap' ? 'Analyzing…' : application.skillGap ? 'Re-analyze skill gap' : 'Analyze skill gap'}
            </button>
          </div>
          {aiError && <p className="mt-2 text-xs text-red-500">{aiError}</p>}
          {application.skillGap && (
            <SkillGapPanel skillGap={application.skillGap} onToggle={toggleGapItem} />
          )}
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
      </DialogContent>
    </Dialog>
  )
}
