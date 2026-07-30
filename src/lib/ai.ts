import { getFunctions, httpsCallable } from 'firebase/functions'

export async function generateResume(applicationId: string): Promise<string> {
  const fn = httpsCallable<{ applicationId: string }, { resumeId: string }>(
    getFunctions(),
    'generateResume'
  )
  const res = await fn({ applicationId })
  return res.data.resumeId
}

export async function testAIConnection(input: {
  provider: string
  /** Omit to test the key already saved server-side. */
  apiKey?: string
  model?: string
}): Promise<{ ok: boolean; reply: string }> {
  const fn = httpsCallable<typeof input, { ok: boolean; reply: string }>(
    getFunctions(),
    'testAIConnection'
  )
  const res = await fn(input)
  return res.data
}

export interface ImportedJob {
  jobTitle: string
  company: string
  location: string
  description: string
}

export async function importJobFromUrl(url: string): Promise<ImportedJob> {
  const fn = httpsCallable<{ url: string }, ImportedJob>(getFunctions(), 'importJobFromUrl')
  const res = await fn({ url })
  return res.data
}

export async function refineResume(resumeId: string, instruction: string): Promise<string> {
  const fn = httpsCallable<{ resumeId: string; instruction: string }, { markdown: string }>(
    getFunctions(),
    'refineResume'
  )
  const res = await fn({ resumeId, instruction })
  return res.data.markdown
}

export async function analyzeSkillGap(applicationId: string): Promise<void> {
  const fn = httpsCallable<{ applicationId: string }, { summary: string; itemCount: number }>(
    getFunctions(),
    'analyzeSkillGap'
  )
  await fn({ applicationId })
}
