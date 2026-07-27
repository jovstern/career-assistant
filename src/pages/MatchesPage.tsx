import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../stores/useAuth'
import { useMatches } from '../stores/useMatches'
import type { JobMatch } from '../stores/useMatches'

function MatchCard({ match, uid }: { match: JobMatch; uid: string }) {
  const { addToBoard, dismiss } = useMatches()
  const [busy, setBusy] = useState(false)

  const act = (fn: () => Promise<void>) => async () => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{match.jobTitle}</p>
          <p className="text-sm text-slate-500">
            {match.company} · {match.location}
          </p>
        </div>
        <span className="rounded-full bg-cobalt-soft px-2 py-0.5 font-mono text-[10px] uppercase text-cobalt">
          {match.remote}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-600">{match.description}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={busy}
          onClick={act(() => addToBoard(uid, match))}
          className="rounded-md bg-cobalt px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Add to board
        </button>
        <button
          disabled={busy}
          onClick={act(() => dismiss(uid, match))}
          className="rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          Dismiss
        </button>
        <a
          href={match.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs text-cobalt hover:underline"
        >
          View job →
        </a>
      </div>
    </div>
  )
}

export function MatchesPage() {
  const user = useAuth((s) => s.user)
  const { matches, loading, fetching, error, subscribe, fetchNow } = useMatches()
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (user) return subscribe(user.uid)
  }, [user, subscribe])

  if (!user) return null

  const runFetch = async () => {
    setInfo('')
    try {
      const res = await fetchNow()
      setInfo(`Agent checked ${res.found} matching jobs, ${res.newMatches} new.`)
    } catch (err) {
      setInfo(err instanceof Error ? err.message : 'Fetch failed')
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Matches</h1>
          <p className="mt-1 text-sm text-slate-500">
            New jobs matching your <Link to="/profile" className="text-cobalt hover:underline">profile preferences</Link>. Refreshed daily at 06:00.
          </p>
        </div>
        <button
          onClick={runFetch}
          disabled={fetching}
          className="rounded-md border border-cobalt px-4 py-2 text-sm font-medium text-cobalt hover:bg-cobalt-soft disabled:opacity-50"
        >
          {fetching ? 'Fetching…' : 'Fetch now'}
        </button>
      </div>
      {info && <p className="mt-3 font-mono text-xs text-slate-500">{info}</p>}

      <div className="mt-6 space-y-3">
        {error ? (
          <p className="text-sm text-red-500">Couldn't load matches: {error}</p>
        ) : loading ? (
          <p className="font-mono text-sm text-slate-400">loading matches…</p>
        ) : matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm text-slate-500">No new matches.</p>
            <p className="mt-1 text-xs text-slate-400">
              Run "Fetch now" or fill in target roles and locations in your profile.
            </p>
          </div>
        ) : (
          matches.map((m) => <MatchCard key={m.id} match={m} uid={user.uid} />)
        )}
      </div>
    </div>
  )
}
