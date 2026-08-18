import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { Download, FileText, MoreVertical, Sparkles, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { db } from '../lib/firebase'
import { generateResume } from '../lib/ai'
import { deleteResume } from '../lib/resumes'
import { downloadElementAsPdf } from '../lib/downloadPdf'
import { useAuth } from '../stores/useAuth'
import { useApplications } from '../stores/useApplications'
import { useProfile } from '../stores/useProfile'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Resume } from '../types'

export function ResumesPage() {
  const user = useAuth((s) => s.user)
  const { applications, subscribe: subscribeApps } = useApplications()
  const { profile, loaded: profileLoaded, load: loadProfile } = useProfile()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [pdfResume, setPdfResume] = useState<Resume | null>(null)
  const [confirmResume, setConfirmResume] = useState<Resume | null>(null)
  const pdfRef = useRef<HTMLElement>(null)

  // Render the chosen resume into a hidden article, then capture it as a PDF.
  useEffect(() => {
    if (!pdfResume) return
    const timer = setTimeout(async () => {
      try {
        if (pdfRef.current) {
          const name = `${pdfResume.company} - ${pdfResume.jobTitle} - resume.pdf`.replace(
            /[/\\:*?"<>|]/g,
            ''
          )
          await downloadElementAsPdf(pdfRef.current, name)
        }
      } finally {
        setPdfResume(null)
      }
    }, 60)
    return () => clearTimeout(timer)
  }, [pdfResume])

  useEffect(() => {
    if (!user) return
    const unsubApps = subscribeApps(user.uid)
    const q = query(collection(db, 'users', user.uid, 'resumes'), orderBy('createdAt', 'desc'))
    const unsubResumes = onSnapshot(q, (snap) => {
      setResumes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Resume))
      setLoading(false)
    })
    return () => {
      unsubApps()
      unsubResumes()
    }
  }, [user, subscribeApps])

  useEffect(() => {
    if (user && !profileLoaded) void loadProfile(user.uid)
  }, [user, profileLoaded, loadProfile])

  if (!user) return null

  const hasBaseResume = !!profile.baseResume?.trim()

  const build = async () => {
    if (!selectedAppId) {
      setError('Pick a job from your board first')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const resumeId = await generateResume(selectedAppId)
      window.open(`/resume/${resumeId}`, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError((err instanceof Error ? err.message : 'Generation failed').replace(/^Firebase: /, ''))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl font-bold">Resumes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Build a resume tailored to a job on your board — the AI combines your own resume with the
        job's requirements.
      </p>

      {!hasBaseResume && profileLoaded && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No base resume yet — <Link to="/profile#resume" className="font-medium underline">upload yours in Profile</Link>{' '}
          for much better results. Until then, resumes are built from your profile details only.
        </div>
      )}

      {profileLoaded && (
        <Link
          to="/profile#resume"
          className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <FileText size={16} className="shrink-0 text-cobalt" />
            <div>
              <p className="text-sm font-medium">Your resume</p>
              <p className="font-mono text-[11px] text-slate-400">
                {hasBaseResume
                  ? `${profile.baseResume!.length.toLocaleString()} characters`
                  : 'Not added yet'}
              </p>
            </div>
          </div>
          <span className="text-xs text-cobalt hover:underline">Edit →</span>
        </Link>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <label className="font-mono text-[11px] uppercase text-slate-400">Target job</label>
        <div className="mt-2 flex gap-2">
          <Select
            value={selectedAppId || null}
            onValueChange={(v) => setSelectedAppId((v as string) ?? '')}
          >
            <SelectTrigger className="h-auto w-full py-2">
              <SelectValue placeholder="Choose from your board…" />
            </SelectTrigger>
            <SelectContent>
              {applications.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.jobTitle} · {app.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={build} disabled={generating || !selectedAppId} className="shrink-0">
            <Sparkles size={14} />
            {generating ? 'Building…' : 'Build resume'}
          </Button>
        </div>
        {applications.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Your board is empty — <Link to="/" className="text-cobalt hover:underline">add an application</Link> first.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      <h2 className="mt-8 font-mono text-[11px] uppercase text-slate-400">Generated resumes</h2>
      <div className="mt-2 space-y-2">
        {loading ? (
          <p className="font-mono text-sm text-slate-400">loading…</p>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing yet — build your first tailored resume above.</p>
        ) : (
          resumes.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md"
            >
              <Link
                to={`/resume/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <FileText size={16} className="shrink-0 text-cobalt" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.jobTitle} · {r.company}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-slate-400 hover:text-ink"
                      title="Resume actions"
                    />
                  }
                >
                  <MoreVertical size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setPdfResume(r)}
                    disabled={pdfResume !== null}
                  >
                    <Download size={14} />
                    {pdfResume?.id === r.id ? 'Preparing…' : 'Download PDF'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmResume(r)}
                    className="text-red-500 data-highlighted:bg-red-50 data-highlighted:text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Off-screen render target used by the Download PDF menu action */}
      {pdfResume && (
        <div aria-hidden className="fixed -left-[10000px] top-0 w-[800px]">
          <article ref={pdfRef} className="prose-resume bg-white p-10">
            <ReactMarkdown>{pdfResume.markdown}</ReactMarkdown>
          </article>
        </div>
      )}

      <ConfirmDialog
        open={confirmResume !== null}
        onOpenChange={(open) => !open && setConfirmResume(null)}
        title="Delete this resume?"
        description={
          confirmResume ? `${confirmResume.jobTitle} · ${confirmResume.company} will be permanently deleted.` : undefined
        }
        onConfirm={async () => {
          if (!user || !confirmResume) return
          try {
            await deleteResume(user.uid, confirmResume.id)
            toastSuccess('Resume deleted')
          } catch (err) {
            toastError(err instanceof Error ? err.message : 'Failed to delete resume')
            throw err
          }
        }}
      />
    </div>
  )
}
