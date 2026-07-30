import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Trash2 } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { db } from '../lib/firebase'
import { refineResume } from '../lib/ai'
import { deleteResume } from '../lib/resumes'
import { downloadElementAsPdf } from '../lib/downloadPdf'
import { useAuth } from '../stores/useAuth'
import type { Resume } from '../types'

export function ResumePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const [resume, setResume] = useState<Resume | null>(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [refining, setRefining] = useState(false)
  const [editError, setEditError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!user || !id) return
    getDoc(doc(db, 'users', user.uid, 'resumes', id))
      .then((snap) => {
        if (snap.exists()) setResume({ id: snap.id, ...snap.data() } as Resume)
        else setError('Resume not found')
      })
      .catch((err) => setError(err.message))
  }, [user, id])

  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>
  if (!resume) return <p className="p-6 font-mono text-sm text-slate-400">loading resume…</p>

  const exportPdf = async () => {
    if (!articleRef.current) return
    setExporting(true)
    try {
      const name = `${resume.company} - ${resume.jobTitle} - resume.pdf`.replace(/[/\\:*?"<>|]/g, '')
      await downloadElementAsPdf(articleRef.current, name)
    } finally {
      setExporting(false)
    }
  }

  const applyEdit = async () => {
    if (!instruction.trim()) {
      setEditError('Tell the AI what to change')
      return
    }
    setRefining(true)
    setEditError('')
    try {
      const markdown = await refineResume(resume.id, instruction.trim())
      setResume({ ...resume, markdown })
      setInstruction('')
      setEditing(false)
    } catch (err) {
      setEditError(
        (err instanceof Error ? err.message : 'Edit failed').replace(/^Firebase: /, '')
      )
    } finally {
      setRefining(false)
    }
  }

  const removeResume = async () => {
    if (!user) return
    if (!window.confirm('Delete this resume? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteResume(user.uid, resume.id)
      navigate('/resumes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="font-display text-xl font-bold">
            {resume.jobTitle} · {resume.company}
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            generated {new Date(resume.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((e) => !e)}
            className="border-cobalt text-xs text-cobalt hover:bg-cobalt-soft hover:text-cobalt"
          >
            <Sparkles size={13} />
            Edit with AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(resume.markdown)}
            className="text-xs"
          >
            Copy markdown
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting} className="text-xs">
            {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={removeResume}
            disabled={deleting}
            title="Delete resume"
            className="text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 rounded-lg border border-cobalt/30 bg-cobalt-soft/40 p-3 print:hidden">
          <label className="font-mono text-[11px] uppercase text-slate-500">
            What should the AI change?
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            autoFocus
            placeholder="e.g. Make the summary shorter and emphasize my React experience; tone down the buzzwords"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:border-cobalt focus:outline-none"
          />
          {editError && <p className="mt-1 text-xs text-red-500">{editError}</p>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={applyEdit} disabled={refining} className="text-xs">
              {refining ? 'Rewriting…' : 'Apply'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              className="text-xs text-slate-500"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <article
        ref={articleRef}
        className={`prose-resume mt-6 rounded-xl border border-slate-200 bg-white p-10 shadow-sm transition-opacity print:mt-0 print:border-0 print:p-0 print:shadow-none ${
          refining ? 'opacity-50' : ''
        }`}
      >
        <ReactMarkdown>{resume.markdown}</ReactMarkdown>
      </article>
    </div>
  )
}
