import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../stores/useAuth'
import type { Resume } from '../types'

export function ResumePage() {
  const { id } = useParams()
  const user = useAuth((s) => s.user)
  const [resume, setResume] = useState<Resume | null>(null)
  const [error, setError] = useState('')

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
            onClick={() => navigator.clipboard.writeText(resume.markdown)}
            className="text-xs"
          >
            Copy markdown
          </Button>
          <Button size="sm" onClick={() => window.print()} className="text-xs">
            Export PDF
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-slate-500" render={<Link to="/" />}>
            Back to board
          </Button>
        </div>
      </div>

      <article className="prose-resume mt-6 rounded-xl border border-slate-200 bg-white p-10 shadow-sm print:mt-0 print:border-0 print:p-0 print:shadow-none">
        <ReactMarkdown>{resume.markdown}</ReactMarkdown>
      </article>
    </div>
  )
}
