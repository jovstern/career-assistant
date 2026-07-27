import { useState } from 'react'
import type { Application } from '../../types'

interface Props {
  onClose: () => void
  onAdd: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
}

const inputCls =
  'w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-cobalt focus:outline-none'

export function AddApplicationModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    company: '',
    jobTitle: '',
    location: '',
    url: '',
    description: '',
  })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onAdd({ ...form, stage: 'saved', notes: '', source: 'manual' })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="font-display text-lg font-bold">Add application</h2>
        <input required placeholder="Job title" value={form.jobTitle} onChange={set('jobTitle')} className={inputCls} />
        <input required placeholder="Company" value={form.company} onChange={set('company')} className={inputCls} />
        <input placeholder="Location (optional)" value={form.location} onChange={set('location')} className={inputCls} />
        <input type="url" placeholder="Job URL (optional)" value={form.url} onChange={set('url')} className={inputCls} />
        <textarea
          placeholder="Job description (optional — used later for resume tailoring)"
          value={form.description}
          onChange={set('description')}
          rows={4}
          className={inputCls}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Add to board
          </button>
        </div>
      </form>
    </div>
  )
}
