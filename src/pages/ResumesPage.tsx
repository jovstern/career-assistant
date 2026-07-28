import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { FileText, Sparkles } from 'lucide-react'
import { db } from '../lib/firebase'
import { generateResume } from '../lib/ai'
import { useAuth } from '../stores/useAuth'
import { useApplications } from '../stores/useApplications'
import { useProfile } from '../stores/useProfile'
import type { Resume } from '../types'

export function ResumesPage() {
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()
  const { applications, subscribe: subscribeApps } = useApplications()
  const { profile, loaded: profileLoaded, load: loadProfile } = useProfile()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

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
      navigate(`/resume/${resumeId}`)
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
          No base resume yet — <Link to="/profile" className="font-medium underline">upload yours in Profile</Link>{' '}
          for much better results. Until then, resumes are built from your profile details only.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <label className="font-mono text-[11px] uppercase text-slate-400">Target job</label>
        <div className="mt-2 flex gap-2">
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-cobalt focus:outline-none"
          >
            <option value="">Choose from your board…</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.jobTitle} · {app.company}
              </option>
            ))}
          </select>
          <button
            onClick={build}
            disabled={generating || !selectedAppId}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {generating ? 'Building…' : 'Build resume'}
          </button>
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
            <Link
              key={r.id}
              to={`/resume/${r.id}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md"
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
          ))
        )}
      </div>
    </div>
  )
}
