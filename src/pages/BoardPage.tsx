import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useAuth } from '../stores/useAuth'
import { useApplications } from '../stores/useApplications'
import { STAGES } from '../types'
import type { Application, Stage } from '../types'
import { Column } from '../components/board/Column'
import { PipelineRail } from '../components/board/PipelineRail'
import { CardModal } from '../components/board/CardModal'
import { AddApplicationModal } from '../components/board/AddApplicationModal'

export function BoardPage() {
  const user = useAuth((s) => s.user)
  const { applications, loading, subscribe, add, update, remove } = useApplications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (user) return subscribe(user.uid)
  }, [user, subscribe])

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, [] as Application[]])) as Record<Stage, Application[]>
    for (const app of applications) map[app.stage]?.push(app)
    return map
  }, [applications])

  const selected = applications.find((a) => a.id === selectedId) ?? null

  const onDragEnd = (e: DragEndEvent) => {
    const stage = e.over?.id as Stage | undefined
    const app = applications.find((a) => a.id === e.active.id)
    if (user && app && stage && STAGES.includes(stage) && app.stage !== stage) {
      void update(user.uid, app.id, { stage })
    }
  }

  if (!user) return null

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Pipeline</h1>
        <Button onClick={() => setAdding(true)}>+ Add application</Button>
      </div>

      <div className="mt-4">
        <PipelineRail applications={applications} />
      </div>

      {loading ? (
        <p className="mt-10 font-mono text-sm text-slate-400">loading board…</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="h-full grid grid-cols-5 gap-2 mt-6 overflow-x-auto">
            {STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                applications={byStage[stage]}
                onCardClick={(app) => setSelectedId(app.id)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {selected && (
        <CardModal
          application={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(data) => update(user.uid, selected.id, data)}
          onDelete={() => remove(user.uid, selected.id)}
        />
      )}
      {adding && <AddApplicationModal onClose={() => setAdding(false)} onAdd={(data) => add(user.uid, data)} />}
    </div>
  )
}
