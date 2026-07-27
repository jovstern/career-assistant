import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Application } from '../../types'

interface Props {
  application: Application
  onClick: () => void
}

export function ApplicationCard({ application, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? 'z-10 opacity-70 shadow-lg' : ''
      }`}
    >
      <p className="text-sm font-medium leading-snug">{application.jobTitle}</p>
      <p className="mt-1 text-xs text-slate-500">{application.company}</p>
      <div className="mt-2 flex items-center justify-between">
        {application.location && (
          <span className="truncate text-[11px] text-slate-400">{application.location}</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-slate-400">
          {new Date(application.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
