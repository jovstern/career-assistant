import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Application } from '../../types'
import { importJobFromUrl } from '../../lib/ai'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
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
  const [showUrlInput, setShowUrlInput] = useState(false)

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
      setShowUrlInput(false)
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
        stage: 'applied',
        notes: '',
        source: 'manual',
      })
      onClose()
    } catch (err) {
      toastError(
        (err instanceof Error ? err.message : 'Failed to add application').replace(
          /^Firebase: /,
          ''
        )
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="block max-h-[88vh] gap-0 overflow-y-auto bg-white p-6 text-ink sm:max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <DialogTitle className="font-display text-lg font-bold">Add application</DialogTitle>

        <div className="rounded-lg border border-dashed border-cobalt/30 bg-cobalt-soft/30 p-2.5">
          {showUrlInput ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                type="url"
                placeholder="e.g. https://www.linkedin.com/jobs/view/1234567890"
                value={form.url}
                onChange={set('url')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    autoFill()
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={autoFill}
                disabled={importing}
                className="h-auto shrink-0 bg-cobalt text-white hover:bg-cobalt/90"
                title="Auto-fill"
              >
                <ArrowRight size={14} />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUrlInput(true)}
              className="h-auto border-cobalt text-xs text-cobalt hover:bg-cobalt-soft hover:text-cobalt"
            >
              <Sparkles size={14} />
              Auto-fill with AI
            </Button>
          )}
          {importError && <p className="mt-1 text-xs text-red-500">{importError}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="company">
            Company <span className="text-destructive">*</span>
          </Label>
          <Input id="company" required value={form.company} onChange={set('company')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="jobTitle">
            Job title <span className="text-destructive">*</span>
          </Label>
          <Input id="jobTitle" required value={form.jobTitle} onChange={set('jobTitle')} />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Location (optional)" value={form.location} onChange={set('location')} />
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
          <Input
            type="email"
            placeholder="Contact email (optional)"
            value={form.contactEmail}
            onChange={set('contactEmail')}
          />
          <Input
            type="tel"
            placeholder="Contact phone (optional)"
            value={form.contactPhone}
            onChange={set('contactPhone')}
          />
        </div>
        <Textarea
          placeholder="About the job - used later for resume tailoring"
          value={form.description}
          onChange={set('description')}
          rows={4}
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
