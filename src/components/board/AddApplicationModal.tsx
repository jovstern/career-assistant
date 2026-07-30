import { useState } from 'react'
import type { Application } from '../../types'
import { importJobFromUrl } from '../../lib/ai'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

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
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const autoFill = async () => {
    if (!form.url.trim()) {
      setImportError('Paste a job link first')
      return
    }
    setImporting(true)
    setImportError('')
    try {
      const job = await importJobFromUrl(form.url.trim())
      debugger
      setForm((f) => ({
        ...f,
        jobTitle: job.jobTitle || f.jobTitle,
        company: job.company || f.company,
        location: job.location || f.location,
        description: job.description || f.description,
      }))
    } catch (err) {
      setImportError(
        (err instanceof Error ? err.message : 'Import failed').replace(/^Firebase: /, '')
      )
    } finally {
      setImporting(false)
    }
  }

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="block max-h-[88vh] gap-0 overflow-y-auto bg-white p-6 text-ink sm:max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <DialogTitle className="font-display text-lg font-bold">Add application</DialogTitle>

        <div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste a LinkedIn job link to auto-fill…"
              value={form.url}
              onChange={set('url')}
              className={inputCls}
            />
            <button
              type="button"
              onClick={autoFill}
              disabled={importing}
              className="shrink-0 rounded-md border border-cobalt px-3 py-2 text-xs font-medium text-cobalt hover:bg-cobalt-soft disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Auto-fill'}
            </button>
          </div>
          {importError && <p className="mt-1 text-xs text-red-500">{importError}</p>}
        </div>

        <input required placeholder="Job title" value={form.jobTitle} onChange={set('jobTitle')} className={inputCls} />
        <input required placeholder="Company" value={form.company} onChange={set('company')} className={inputCls} />
        <input placeholder="Location (optional)" value={form.location} onChange={set('location')} className={inputCls} />
        <textarea
          placeholder="About the job - used later for resume tailoring"
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
      </DialogContent>
    </Dialog>
  )
}
