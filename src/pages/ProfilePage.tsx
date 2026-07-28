import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../stores/useAuth'
import { useProfile } from '../stores/useProfile'
import { parseResumeFile } from '../lib/parseResumeFile'
import type { UserProfile } from '../types'

const inputCls =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cobalt focus:outline-none'
const labelCls = 'font-mono text-[11px] uppercase text-slate-400'

const SENIORITIES: UserProfile['seniority'][] = ['junior', 'mid', 'senior', 'staff', 'principal']
const REMOTE: UserProfile['preferences']['remote'][] = ['any', 'remote', 'hybrid', 'onsite']

export function ProfilePage() {
  const user = useAuth((s) => s.user)
  const { profile, loaded, load, save } = useProfile()
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [parsing, setParsing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setUploadError('')
    try {
      const text = await parseResumeFile(file)
      if (!text) throw new Error('No text could be extracted from that file')
      setForm((f) => ({ ...f, baseResume: text }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read the file')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  useEffect(() => {
    if (user && !loaded) void load(user.uid)
  }, [user, loaded, load])

  useEffect(() => {
    setForm(profile)
  }, [profile])

  if (!user) return null
  if (!loaded) return <p className="p-6 font-mono text-sm text-slate-400">loading profile…</p>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await save(user.uid, form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const csv = (value: string) =>
    value.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Drives job matching and resume tailoring.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Current title</label>
            <input
              value={form.title}
              placeholder="e.g. Frontend Engineer"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Seniority</label>
          <div className="mt-1 flex gap-1.5">
            {SENIORITIES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setForm({ ...form, seniority: s })}
                className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                  form.seniority === s
                    ? 'bg-cobalt text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Skills (comma-separated)</label>
          <input
            value={form.skills.join(', ')}
            placeholder="React, TypeScript, Node.js"
            onChange={(e) => setForm({ ...form, skills: csv(e.target.value) })}
            className={inputCls}
          />
        </div>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className={`${labelCls} px-1`}>Job preferences</legend>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Target roles (comma-separated)</label>
              <input
                value={form.preferences.roles.join(', ')}
                placeholder="Senior Frontend Engineer, Full-Stack Developer"
                onChange={(e) =>
                  setForm({ ...form, preferences: { ...form.preferences, roles: csv(e.target.value) } })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Locations (comma-separated)</label>
              <input
                value={form.preferences.locations.join(', ')}
                placeholder="Tel Aviv, Remote"
                onChange={(e) =>
                  setForm({ ...form, preferences: { ...form.preferences, locations: csv(e.target.value) } })
                }
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Work mode</label>
                <select
                  value={form.preferences.remote}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferences: {
                        ...form.preferences,
                        remote: e.target.value as UserProfile['preferences']['remote'],
                      },
                    })
                  }
                  className={inputCls}
                >
                  {REMOTE.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Min salary (optional)</label>
                <input
                  type="number"
                  value={form.preferences.minSalary ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferences: {
                        ...form.preferences,
                        minSalary: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className={`${labelCls} px-1`}>Your resume</legend>
          <p className="text-xs text-slate-500">
            Upload or paste your current resume. The AI resume builder combines it with jobs from
            your board to produce tailored versions.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="rounded-md border border-cobalt px-3 py-1.5 text-xs font-medium text-cobalt hover:bg-cobalt-soft disabled:opacity-50"
            >
              {parsing ? 'Reading…' : 'Upload file (PDF / TXT / MD)'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              onChange={onResumeFile}
              className="hidden"
            />
            {form.baseResume && (
              <span className="font-mono text-[11px] text-slate-400">
                {form.baseResume.length.toLocaleString()} characters loaded
              </span>
            )}
          </div>
          {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
          <textarea
            value={form.baseResume ?? ''}
            onChange={(e) => setForm({ ...form, baseResume: e.target.value })}
            rows={8}
            placeholder="…or paste your resume text here"
            className={`${inputCls} mt-3 font-mono text-xs`}
          />
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Save profile
          </button>
          {saved && <span className="font-mono text-xs text-stage-offer">saved ✓</span>}
        </div>
      </form>
    </div>
  )
}
