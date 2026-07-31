import { useState } from 'react'
import type { Application } from '../../types'
import { importJobFromUrl } from '../../lib/ai'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const WORK_MODES = [
  { value: 'onsite', label: 'On site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
] as const

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
    contactEmail: '',
    contactPhone: '',
    workMode: '' as '' | 'onsite' | 'hybrid' | 'remote',
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
      const { workMode, ...rest } = form
      await onAdd({
        ...rest,
        workMode: workMode || undefined,
        stage: 'saved',
        notes: '',
        source: 'manual',
      })
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
            <Button
              type="button"
              variant="outline"
              onClick={autoFill}
              disabled={importing}
              className="h-auto shrink-0 border-cobalt text-xs text-cobalt hover:bg-cobalt-soft hover:text-cobalt"
            >
              {importing ? 'Importing…' : 'Auto-fill'}
            </Button>
          </div>
          {importError && <p className="mt-1 text-xs text-red-500">{importError}</p>}
        </div>

        <input required placeholder="Company" value={form.company} onChange={set('company')} className={inputCls} />
        <input required placeholder="Job title" value={form.jobTitle} onChange={set('jobTitle')} className={inputCls} />
        <div className="flex gap-2">
          <input placeholder="Location (optional)" value={form.location} onChange={set('location')} className={inputCls} />
          <Select
            value={form.workMode || null}
            onValueChange={(v) => setForm((f) => ({ ...f, workMode: v as typeof f.workMode }))}
          >
            <SelectTrigger className="h-auto w-40 shrink-0 py-2">
              <SelectValue placeholder="Work mode" />
            </SelectTrigger>
            <SelectContent>
              {WORK_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Contact email (optional)"
            value={form.contactEmail}
            onChange={set('contactEmail')}
            className={inputCls}
          />
          <input
            type="tel"
            placeholder="Contact phone (optional)"
            value={form.contactPhone}
            onChange={set('contactPhone')}
            className={inputCls}
          />
        </div>
        <textarea
          placeholder="About the job - used later for resume tailoring"
          value={form.description}
          onChange={set('description')}
          rows={4}
          className={inputCls}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="text-slate-500">
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Add to board
          </Button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  )
}
