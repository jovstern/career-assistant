import { useEffect, useState } from 'react'
import { useAuth } from '../stores/useAuth'
import { useApplications } from '../stores/useApplications'
import { useGrowthItems } from '../stores/useGrowthItems'
import { adviseGrowthItem } from '../lib/ai'
import type { GrowthItem } from '../types'
import { GrowthItemCard } from '@/components/growth/GrowthItemCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/lib/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function GrowthPage() {
  const user = useAuth((s) => s.user)
  const { applications, subscribe: subscribeApps } = useApplications()
  const { items, loading, subscribe: subscribeItems, add, update } = useGrowthItems()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<GrowthItem['priority']>('medium')
  const [adding, setAdding] = useState(false)
  const [advisingId, setAdvisingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const unsubApps = subscribeApps(user.uid)
    const unsubItems = subscribeItems(user.uid)
    return () => {
      unsubApps()
      unsubItems()
    }
  }, [user, subscribeApps, subscribeItems])

  if (!user) return null

  const relatedLabel = (ids: string[]) =>
    ids
      .map((id) => applications.find((a) => a.id === id))
      .filter((a): a is (typeof applications)[number] => !!a)
      .map((a) => `${a.company} · ${a.jobTitle}`)
      .join(', ')

  const addItem = async () => {
    if (!title.trim()) return
    setAdding(true)
    try {
      await add(user.uid, { title: title.trim(), notes: notes.trim() || undefined, priority })
      setTitle('')
      setNotes('')
      setPriority('medium')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAdding(false)
    }
  }

  const toggleDone = async (item: GrowthItem) => {
    try {
      await update(user.uid, item.id, { done: !item.done })
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  const saveItemNotes = async (item: GrowthItem, notes: string) => {
    try {
      await update(user.uid, item.id, { notes })
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save notes')
      throw err
    }
  }

  const askAdvice = async (item: GrowthItem) => {
    setAdvisingId(item.id)
    try {
      await adviseGrowthItem(item.id)
    } catch (err) {
      toastError((err instanceof Error ? err.message : 'Failed to get AI advice').replace(/^Firebase: /, ''))
    } finally {
      setAdvisingId(null)
    }
  }

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl font-bold">Growth</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything you're working on to improve — whatever you already know about a rejection, or
        whatever the AI finds when you analyze one. Add your own items too.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <label className="font-mono text-[11px] uppercase text-slate-400">Add an item</label>
        <div className="mt-2 flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. System design depth"
            className="flex-1"
          />
          <Select value={priority} onValueChange={(v) => setPriority(v as GrowthItem['priority'])}>
            <SelectTrigger className="h-auto w-28 py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="mt-2"
        />
        <Button onClick={addItem} disabled={adding || !title.trim()} className="mt-2">
          Add
        </Button>
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase text-slate-400">Your list</h2>
        {items.length > 0 && (
          <p className="font-mono text-[11px] text-slate-400">
            {doneCount}/{items.length} addressed
          </p>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {loading ? (
          <p className="font-mono text-sm text-slate-400">loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing yet — add something you know you should work on, or mark an application
            Rejected and write down (or ask AI for) what went wrong.
          </p>
        ) : (
          items.map((item) => (
            <GrowthItemCard
              key={item.id}
              item={item}
              relatedLabel={relatedLabel(item.relatedApplicationIds)}
              onToggleDone={() => toggleDone(item)}
              onSaveNotes={(notes) => saveItemNotes(item, notes)}
              onAskAdvice={() => askAdvice(item)}
              advising={advisingId === item.id}
            />
          ))
        )}
      </div>
    </div>
  )
}
